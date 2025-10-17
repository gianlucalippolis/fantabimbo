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
    {
      method: "GET",
      path: "/name-submissions/parent-names/:gameId",
      handler: "name-submission.getParentNames",
      config: {
        policies: ["global::is-authenticated"],
      },
    },
  ],
};
