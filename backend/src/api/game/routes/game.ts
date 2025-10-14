import { factories } from "@strapi/strapi";

export default factories.createCoreRouter("api::game.game", {
  config: {
    policies: ["global::is-authenticated"],
  },
  routes: [
    { method: "GET", path: "/games", handler: "game.find" },
    { method: "GET", path: "/games/:id", handler: "game.findOne" },
    { method: "POST", path: "/games", handler: "game.create" },
    { method: "DELETE", path: "/games/:id", handler: "game.delete" },
    { method: "POST", path: "/games/join", handler: "game.joinByCode" },
    {
      method: "POST",
      path: "/games/:id/regenerate-invite",
      handler: "game.regenerateInvite",
    },
  ],
} as any);
