const pptxgen = require('pptxgenjs');
const path = require('path');
const html2pptx = require('C:/Users/86195/.claude/skills/pptx/scripts/html2pptx');

const SLIDES_DIR = path.join(__dirname, 'slides');
const OUTPUT = path.join(__dirname, 'YuanBaoAI-项目答辩.pptx');

const slides = [
  'slide01-title.html',
  'slide02-overview.html',
  'slide03-chat.html',
  'slide04-image.html',
  'slide05-education.html',
  'slide06-multimedia.html',
  'slide07-architecture.html',
  'slide08-stats.html',
  'slide09-summary.html',
];

async function create() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'YuanBaoAI';
  pptx.title = 'YuanBaoAI 项目答辩';

  for (const slideFile of slides) {
    const slidePath = path.join(SLIDES_DIR, slideFile);
    console.log(`Processing: ${slideFile}`);
    try {
      await html2pptx(slidePath, pptx);
    } catch (err) {
      console.error(`Error processing ${slideFile}:`, err.message);
    }
  }

  await pptx.writeFile({ fileName: OUTPUT });
  console.log(`\nPresentation saved to: ${OUTPUT}`);
}

create().catch(console.error);
