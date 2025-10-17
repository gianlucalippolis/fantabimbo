export default {
  async updateAvatar(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized("Non autenticato");
      }

      const { files } = ctx.request;

      if (!files || !files.avatar) {
        return ctx.badRequest("Nessun file caricato");
      }

      const avatarFile = Array.isArray(files.avatar)
        ? files.avatar[0]
        : files.avatar;

      // Upload file using Strapi upload service
      const uploadedFiles = await strapi.plugins.upload.services.upload.upload({
        data: {
          refId: userId,
          ref: "plugin::users-permissions.user",
          field: "avatar",
        },
        files: avatarFile,
      });

      // Update user with new avatar
      await strapi.entityService.update(
        "plugin::users-permissions.user",
        userId,
        {
          data: {
            avatar: uploadedFiles[0]?.id,
          },
        }
      );

      return ctx.send({
        success: true,
        avatar: uploadedFiles[0],
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      return ctx.internalServerError(
        "Errore durante il caricamento dell'avatar"
      );
    }
  },
};
