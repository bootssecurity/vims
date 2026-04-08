export default async function testSubHandler({ event, container }: any) {
  const cache = await container.resolve("provider:cache-redis");
  await cache.set("test-namespace", `event-processed-${event.payload?.id}`, { fired: true });
}

export const config = {
  event: "integration.test",
};
