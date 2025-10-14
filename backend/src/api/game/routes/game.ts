import { factories } from "@strapi/strapi";

export default factories.createCoreRouter("api::game.game", {
  config: {
    policies: ["global::is-authenticated"],
  },
  only: ["find", "findOne", "create", "delete"],
  routes: [
    {
      method: "POST",
      path: "/games/join",
      handler: "game.joinByCode",
    },
    {
      method: "POST",
      path: "/games/:id/regenerate-invite",
      handler: "game.regenerateInvite",
    },
  ],
} as any);
