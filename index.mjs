import MarkdownIt from 'markdown-it';
import container_plugin from 'markdown-it-container';
import fs from 'fs-extra';
import path from 'path';
import juice from 'juice';

const template1Start = `<div class="container">`;
const template1End = `</div>`

const template2Start = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        .naver-cafe-post {
            width: 743px;
            padding: 14px;
            border: 1px rgb(218, 216, 215) solid;
            margin: 0 auto;
        }
    </style>
</head>
<body>
<article class="naver-cafe-post">
`;

const template2End = `
</div>
</body>
</html>
`;

main();

async function main() {
    const md = new MarkdownIt({
        html: true,
        breaks: true,
        typographer: true
    }).use(container_plugin, 'tip', {
        render: (tokens, idx) => {
            if (tokens[idx].nesting === 1) {
                return `<div class="tip-header">파차식 팁</div>\n<div class="tip">`;
            } else {
                return `</div>\n`;
            }
        }
    });
    const oldImageRule = md.renderer.rules.image;
    md.renderer.rules.image = (tokens, idx, options, env, slf) => {
        if (tokens[idx].nesting !== 0) return oldImageRule(tokens, idx, options, env, slf);

        let result = oldImageRule(tokens, idx, options, env, slf);
        if (idx === 0) {
            result = `<div class="img-wrapper">` + result;
        }
        if (idx === tokens.length - 1) {
            result = result + `</div>`;
        }
        return result;
    };

    const css = await fs.readFile('./style.css', 'utf8');

    await fs.emptyDir('./generated');
    await fs.copy('./images', './generated/images');
    await fs.writeFile('./generated/CNAME', 'tutorial.finalchild.me\n');

    const filenames = await fs.readdir('./articles');
    filenames.map(async filename => {
        const baseName = filename.replace(/\.[^/.]+$/, '');
        convertFile(md, css, path.join('./articles', filename), path.join('./generated', baseName + '.html.txt'), path.join('./generated', baseName + '.html'));
    }).forEach(async promise => {
        await promise;
    });
}

async function convertFile(md, css, srcPath, targetTxtPath, targetHtmlPath) {
    const src = await fs.readFile(srcPath, 'utf8');
    const rendered = md.render(src);
    const templated1 = template1Start + rendered + template1End;
    const juiced = juice.inlineContent(templated1, css, {
        inlinePseudoElements: true,
        preserveFontFaces: false,
        preserveImpotant: false,
        preserveMediaQueries: false,
        preserveKeyFrames: false,
        preservePseudos: false
    });
    const templated2 = template2Start + juiced + template2End;
    
    const txtPromise = fs.writeFile(targetTxtPath, juiced);
    const htmlPromise = fs.writeFile(targetHtmlPath, templated2);
    await txtPromise;
    await htmlPromise;
}
