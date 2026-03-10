const { execSync } = require('child_process');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf-8');
const lines = envFile.split('\n').filter(line => line.trim() !== '');

for (const line of lines) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=');
    if (key && value) {
        try {
            console.log(`Adding ${key}...`);
            execSync(`npx vercel env rm ${key} production preview development -y`, { stdio: 'ignore' });
        } catch (e) { }
        try {
            execSync(`echo ${value} | npx vercel env add ${key} production,preview,development`, { stdio: 'inherit' });
        } catch (e) {
            console.error(`Failed to add ${key}`);
        }
    }
}
console.log("Done.");
