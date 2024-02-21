(function () {
  // TODO: Sign messages
  // TODO: Verify signatures

  let rsa = forge.pki.rsa;
  let keypair;

  function newKeyPair() {
    // 2048 bits. Not the most super-duper secure length of 4096.
    // This value must remain low to ensure lower-power machines can use.
    // We will generate new keys automatically every so often and will also allow user to refresh keys.
    keypair = rsa.generateKeyPair({ bits: 2048, workers: -1 });
  }
  function encrypt(message) {
    if (!keypair) return null;
    return keypair.publicKey.encrypt("Test message");
  }
  function decrypt(message) {
    if (!keypair) return null;
    return keypair.privateKey.decrypt(encrypted);
  }
})();
