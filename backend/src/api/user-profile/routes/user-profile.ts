export default {
  routes: [
    {
      method: "POST",
      path: "/user-profile/avatar",
      handler: "user-profile.uploadAvatar",
      config: {
        policies: ["global::is-authenticated"],
      },
    },
  ],
};
