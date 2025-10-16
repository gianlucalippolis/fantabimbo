export default async (policyContext, config, { strapi }) => {
  const authHeader = policyContext.request.header.authorization;

  if (!authHeader) {
    return false; // blocca la richiesta
  }

  const token = authHeader.split(" ")[1];

  try {
    const { id } = await strapi
      .service("plugin::users-permissions.jwt")
      .verify(token);

    // recupera utente autenticato se serve
    const user = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { id } });

    if (!user) return false;

    // aggiungi utente al contesto, così lo puoi usare nel controller
    policyContext.state.user = user;

    return true;
  } catch (err) {
    return false;
  }
};
