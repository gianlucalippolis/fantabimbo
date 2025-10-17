export default {
  routes: [
    {
      method: "GET",
      path: "/name-submissions",
      handler: "name-submission.find",
      config: {
        policies: ["global::is-authenticated"],
      },
    },
    {
      method: "POST",
      path: "/name-submissions",
      handler: "name-submission.create",
      config: {
        policies: ["global::is-authenticated"],
      },
    },
    {
      method: "GET",
      path: "/name-submissions/calculate-victory/:gameId",
      handler: "name-submission.calculateVictory",
      config: {
        policies: ["global::is-authenticated"],
      },
    },
  ],
};
