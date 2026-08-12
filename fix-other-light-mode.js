const fs = require('fs');

function fixLightMode(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');

  // Specific header titles
  code = code.replace(/text-5xl font-medium leading-\[1.1\] tracking-tight text-white/g, 'text-5xl font-medium leading-[1.1] tracking-tight text-foreground');

  // Plus button
  code = code.replace(/bg-white text-black flex items-center/g, 'bg-white text-black border border-black/5 dark:border-transparent flex items-center');

  // Specific #151515 wrappers
  code = code.replace(/bg-\[\#151515\] rounded-\[40px\] p-6 border border-white\/5/g, 'bg-white dark:bg-[#151515] shadow-sm dark:shadow-none rounded-[40px] p-6 border border-black/5 dark:border-white/5');
  
  // Tasks in CalendarView & HomeChat
  code = code.replace(/bg-\[\#151515\] border border-white\/5/g, 'bg-white dark:bg-[#151515] border border-black/5 dark:border-white/5 shadow-sm dark:shadow-none');

  // HomeChat specific wrappers
  code = code.replace(/bg-white\/5 border border-white\/5/g, 'bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5');

  // Opacities
  code = code.replace(/border-white\/10/g, 'border-black/10 dark:border-white/10');
  code = code.replace(/text-white\/80/g, 'text-black/80 dark:text-white/80');
  code = code.replace(/text-white\/70/g, 'text-black/70 dark:text-white/70');
  code = code.replace(/text-white\/60/g, 'text-black/60 dark:text-white/60');
  code = code.replace(/text-white\/50/g, 'text-black/50 dark:text-white/50');
  code = code.replace(/text-white\/40/g, 'text-black/40 dark:text-white/40');
  code = code.replace(/text-white\/30/g, 'text-black/30 dark:text-white/30');
  code = code.replace(/text-white\/20/g, 'text-black/20 dark:text-white/20');
  
  code = code.replace(/hover:text-white(?![A-Za-z0-9\-\/])/g, 'hover:text-foreground');
  code = code.replace(/text-white(?![A-Za-z0-9\-\/])/g, 'text-foreground');
  
  code = code.replace(/hover:bg-white\/10/g, 'hover:bg-black/10 dark:hover:bg-white/10');
  code = code.replace(/(?<!hover:)bg-white\/10/g, 'bg-black/10 dark:bg-white/10');
  code = code.replace(/hover:bg-white\/5/g, 'hover:bg-black/5 dark:hover:bg-white/5');
  code = code.replace(/(?<!hover:)bg-white\/5/g, 'bg-black/5 dark:bg-white/5');

  fs.writeFileSync(file, code);
}

fixLightMode('src/components/CalendarView.tsx');
fixLightMode('src/components/HomeChat.tsx');
fixLightMode('src/components/NotesView.tsx');
fixLightMode('src/components/AndroidAppBanner.tsx');

console.log('Done');
