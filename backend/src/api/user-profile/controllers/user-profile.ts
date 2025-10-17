export default {
  async uploadAvatar(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized("Non autenticato");
      }

      // Get uploaded files from request
      const files = ctx.request.files;

      if (!files || !files.avatar) {
        return ctx.badRequest("Nessun file caricato");
      }

      let avatarFile = files.avatar;

      // Handle array of files
      if (Array.isArray(avatarFile)) {
        avatarFile = avatarFile[0];
      }

      // Upload the file using Strapi's upload service
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

      return ctx.send({
        success: true,
        avatar: uploadedFiles[0],
      });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      return ctx.internalServerError(
        error.message || "Errore durante il caricamento dell'avatar"
      );
    }
  },
};
