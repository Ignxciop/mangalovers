import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("\nClaves VAPID generadas.\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_EMAIL=tu-email@dominio.com`);
