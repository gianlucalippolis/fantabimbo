"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/users/avatar",
      handler: "user.updateAvatar",
      config: {
        policies: [],
        prefix: "",
      },
    },
  ],
};
