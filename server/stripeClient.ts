import Stripe from 'stripe';

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';

  for (const env of isProduction ? ['production', 'development'] : ['development', 'production']) {
    try {
      const url = new URL(`https://${hostname}/api/v2/connection`);
      url.searchParams.set('include_secrets', 'true');
      url.searchParams.set('connector_names', 'stripe');
      url.searchParams.set('environment', env);

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'X-Replit-Token': xReplitToken
        }
      });

      const data = await response.json();
      const connectionSettings = data.items?.[0];

      if (connectionSettings?.settings?.publishable && connectionSettings?.settings?.secret) {
        return {
          publishableKey: connectionSettings.settings.publishable,
          secretKey: connectionSettings.settings.secret,
        };
      }
    } catch {}
  }

  throw new Error('Stripe not configured — add live or test keys to enable payments');
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey);
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}
