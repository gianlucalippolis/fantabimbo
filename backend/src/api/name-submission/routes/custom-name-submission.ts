export default {
  routes: [
    {
      method: "GET",
      path: "/name-submissions/victory/:gameId",
      handler: "name-submission.calculateVictory",
      config: {
        policies: ["global::is-authenticated"],
      },
    },
  ],
};
