'use strict';

// tesseract
const { createWorker } = require('tesseract.js');

// google vision
const vision = require('@google-cloud/vision');

// config module
const configModule = require('./config-module');

// file module
const fileModule = require('./file-module');

// window module
const windowModule = require('./window-module');

// engine module
const engineModule = require('./engine-module');

// correction-module
const { correctionEntry } = require('../correction/correction-module');

// data path
const dataPath = fileModule.getRootPath('src', 'data');

// current worker
let currentWoker = null;

// google vision
async function googleVision(imagePath) {
    try {
        const path = fileModule.getUserDataPath('setting', 'google-credential.json');
        if (!fileModule.fileChecker(path)) {
            throw '尚未設定Google憑證，請先至【設定】>【系統】取得憑證';
        }

        const client = new vision.ImageAnnotatorClient({
            keyFilename: fileModule.getUserDataPath('setting', 'google-credential.json'),
        });
        const [result] = await client.textDetection(imagePath);
        const detections = result.textAnnotations[0];

        if (detections?.description) {
            fixImageText(detections.description);
        } else {
            throw result.error;
        }
    } catch (error) {
        console.log(error);
        windowModule.sendIndex('show-notification', '無法辨識圖片文字: ' + error);
    }
}

// tesseract ocr
async function tesseractOCR(imageBuffer) {
    try {
        const config = configModule.getConfig();

        if (!currentWoker) {
            // set worker
            currentWoker = await createWorker({
                langPath: getDataPath('tesseract'),
                cacheMethod: 'none',
                gzip: false,
            });

            // load worker
            await currentWoker.load();
        }

        // load language
        if (config.translation.from === engineModule.languageEnum.ja) {
            await currentWoker.loadLanguage('jpn');
            await currentWoker.initialize('jpn');
        } else if (config.translation.from === engineModule.languageEnum.en) {
            await currentWoker.loadLanguage('eng');
            await currentWoker.initialize('eng');
        }

        // recognize text
        const {
            data: { text },
        } = await currentWoker.recognize(imageBuffer);

        // fix or error
        if (text.trim().length !== 0) {
            fixImageText(text);
        } else {
            windowModule.sendIndex('show-notification', '擷取文字為空白，請更換辨識模式');
        }
    } catch (error) {
        console.log(error);
        windowModule.sendIndex('show-notification', '無法辨識圖片文字: ' + error);
        currentWoker = null;
    }
}

// fix image text
function fixImageText(text) {
    // get config
    const config = configModule.getConfig();

    // fix
    if (config.translation.from !== 'Japanese') {
        text = text.replaceAll('...', '…').replaceAll('・・・', '…').replaceAll('=', '＝');
    }

    if (config.captureWindow.type !== 'google') {
        if (config.translation.from === engineModule.languageEnum.ja) {
            text = text.replaceAll(' ', '');
        }

        text = text
            .replaceAll('\n\n', '\n')
            .replaceAll('`', '「')
            .replaceAll('ガンプレイカー', 'ガンブレイカー')
            .replaceAll('ガンプブレイカー', 'ガンブレイカー')
            .replaceAll(/間の(?=使徒|戦士|巫女|世界)/gi, '闇の')
            .replaceAll(/(?<=機工|飛空|整備|道|戦|闘|兵)(填|土)/gi, '士');
    }

    // show notification
    windowModule.sendIndex('show-notification', '辨識完成');

    // return if edit is true
    if (config.captureWindow.edit) {
        windowModule.restartWindow('capture-edit', text);
        return;
    }

    // translate image text
    translateImageText(text);
}

// translate image text
async function translateImageText(text) {
    const config = configModule.getConfig();

    // set string array
    let stringArray = [];
    if (config.captureWindow.split) {
        stringArray = text.split('\n');
    } else {
        if (config.translation.from === engineModule.languageEnum.ja) {
            stringArray = [text.replaceAll('\n', '')];
        } else {
            stringArray = [text.replaceAll('\n', ' ')];
        }
    }

    // delete images
    deleteImages();

    // start translate
    for (let index = 0; index < stringArray.length; index++) {
        const element = stringArray[index];
        if (element !== '') {
            const dialogData = {
                code: '003D',
                name: '',
                text: element,
            };

            await engineModule.sleep(100);
            correctionEntry(dialogData, config.translation);
        }
    }
}

// get data path
function getDataPath(fileName) {
    return fileModule.getPath(dataPath, fileName);
}

// delete images
function deleteImages() {
    const images = ['screenshot.png', 'crop.png'];

    images.forEach((value) => {
        try {
            fileModule.fileDeleter(getDataPath(value));
        } catch (error) {
            console.log(error);
        }
    });
}

module.exports = {
    googleVision,
    tesseractOCR,
    translateImageText,
};
