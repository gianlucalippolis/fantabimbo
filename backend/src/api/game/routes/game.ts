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
      config: {
        auth: {
          strategies: ["jwt"],
        },
      },
    },
    {
      method: "POST",
      path: "/games/:id/regenerate-invite",
      handler: "game.regenerateInvite",
      config: {
        auth: {
          strategies: ["jwt"],
        },
      },
    },
  ],
} as any);
