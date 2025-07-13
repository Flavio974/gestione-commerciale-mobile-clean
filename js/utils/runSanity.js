window.runSanity = () => {
  const dup = [...document.querySelectorAll('script[src]')]
    .reduce((acc, s) => {
      const p = new URL(s.src).pathname;
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});
  const dupCount = Object.values(dup).filter(n => n > 1).length;
  const uncaught = performance.getEntriesByType('resource')
    .filter(e => e.initiatorType === 'script' && e.responseStatus >= 400);
  console.log(
    `✅ Sanity check: ${dupCount} duplicati, ${uncaught.length} errori rete`
  );
  return { dupCount, uncaught };
};