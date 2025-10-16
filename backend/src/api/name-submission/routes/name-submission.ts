import { factories } from "@strapi/strapi";

export default factories.createCoreRouter(
  "api::name-submission.name-submission",
  {
    config: {
      policies: ["global::is-authenticated"],
    },
    only: ["find", "create"],
  } as any
);
