export default {
  routes: [
    {
      method: "GET",
      path: "/games/validate",
      handler: "game.validate",
      config: {
        auth: false,
      },
    },
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
};
