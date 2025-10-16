import { factories } from "@strapi/strapi";

export default factories.createCoreRouter("api::game.game", {
  config: {
    policies: ["global::is-authenticated"],
  },
  only: ["find", "findOne", "create", "delete"],
} as any);
