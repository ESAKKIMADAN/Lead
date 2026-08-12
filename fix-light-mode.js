const fs = require('fs');

let css = fs.readFileSync('src/app/globals.css', 'utf8');
css = css.replace('--background: #F7EED2;', '--background: #ffffff;');
fs.writeFileSync('src/app/globals.css', css);

let tsx = fs.readFileSync('src/components/AccountView.tsx', 'utf8');

tsx = tsx.replace(/bg-\[\#151515\]/g, 'bg-white dark:bg-[#151515]');
tsx = tsx.replace(/bg-\[\#0a0a0a\]/g, 'bg-black/5 dark:bg-[#0a0a0a]');
tsx = tsx.replace(/border-white\/([0-9]+)/g, 'border-black/$1 dark:border-white/$1');
tsx = tsx.replace(/hover:bg-white\/([0-9]+)/g, 'hover:bg-black/$1 dark:hover:bg-white/$1');
tsx = tsx.replace(/bg-white\/([0-9]+)/g, 'bg-black/$1 dark:bg-white/$1');
tsx = tsx.replace(/text-white\/([0-9]+)/g, 'text-black/$1 dark:text-white/$1');
tsx = tsx.replace(/text-white(?![A-Za-z0-9\-\/])/g, 'text-foreground');
tsx = tsx.replace(/bg-white text-black/g, 'bg-foreground text-background');

fs.writeFileSync('src/components/AccountView.tsx', tsx);
console.log('Done');
