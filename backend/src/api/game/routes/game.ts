import { factories } from "@strapi/strapi";

export default factories.createCoreRouter(
  "api::game.game",
  {
    config: {
      find: {
        auth: {
          strategies: ["jwt"],
        },
      },
      findOne: {
        auth: {
          strategies: ["jwt"],
        },
      },
      create: {
        auth: {
          strategies: ["jwt"],
        },
      },
    },
    only: ["find", "findOne", "create"],
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
  } as any
);
