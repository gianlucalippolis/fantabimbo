import { factories } from "@strapi/strapi";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_LENGTH = 6;
const MAX_ATTEMPTS = 12;

function createInviteCode(): string {
  return Array.from({ length: INVITE_LENGTH })
    .map(
      () =>
        INVITE_ALPHABET[
          Math.floor(Math.random() * INVITE_ALPHABET.length)
        ]
    )
    .join("");
}

export default factories.createCoreService("api::game.game", ({ strapi }) => ({
  async generateInviteCode(): Promise<string> {
    let attempts = 0;
    let code = "";

    while (attempts < MAX_ATTEMPTS) {
      code = createInviteCode();

      const existing = await strapi.db.query("api::game.game").findOne({
        where: {
          inviteCode: code,
        },
        select: ["id"],
      });

      if (!existing) {
        return code;
      }

      attempts += 1;
    }

    throw new Error(
      "Invite code generation exceeded maximum attempts. Please retry."
    );
  },
}));
