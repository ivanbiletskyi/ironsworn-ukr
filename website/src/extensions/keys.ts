// Публічні ключі, якими хост перевіряє підписи релізів розширень (verify.ts).
// Ключ обирається за `kid` релізу. Щоб замінити ключ без простою: додайте
// новий (extension-kit/keygen.mjs), перепідпишіть релізи, потім приберіть
// старий.

export const SIGNING_KEYS: Readonly<Record<string, JsonWebKey>> = {
  k20261003: {
    kty: 'EC',
    crv: 'P-256',
    x: '8-uFi2L9MQx1mEzSux7KbkmB3waneK4DS8iG9gZUTc8',
    y: 'eAjZh1duS7DUBnnP32aaDdVMDgBvu5weGwedyY0-qAs',
  },
};
