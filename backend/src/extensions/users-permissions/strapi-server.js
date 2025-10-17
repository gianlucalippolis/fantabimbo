"use strict";

module.exports = (plugin) => {
  // Add custom routes
  plugin.routes["content-api"].routes.push({
    method: "POST",
    path: "/users/avatar",
    handler: "user.updateAvatar",
    config: {
      policies: [],
      prefix: "",
    },
  });

  // Add custom controller
  plugin.controllers.user.updateAvatar = async (ctx) => {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        ctx.status = 401;
        return (ctx.body = { error: "Non autenticato" });
      }

      // Get uploaded files from request
      const files = ctx.request.files;

      if (!files || !files.avatar) {
        ctx.status = 400;
        return (ctx.body = { error: "Nessun file caricato" });
      }

      let avatarFile = files.avatar;

      // Handle array of files
      if (Array.isArray(avatarFile)) {
        avatarFile = avatarFile[0];
      }

      // Upload the file
      const uploadedFiles = await strapi
        .plugin("upload")
        .service("upload")
        .upload({
          data: {
            refId: userId,
            ref: "plugin::users-permissions.user",
            field: "avatar",
          },
          files: avatarFile,
        });

      ctx.status = 200;
      ctx.body = {
        success: true,
        avatar: uploadedFiles[0],
      };
    } catch (error) {
      console.error("Avatar upload error:", error);
      ctx.status = 500;
      ctx.body = {
        error: error.message || "Errore durante il caricamento dell'avatar",
      };
    }
  };

  return plugin;
};
