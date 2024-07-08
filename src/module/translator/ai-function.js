'use strict';

function createSystemContent(source = 'Japanese', target = 'Chinese') {
  return `You are a professional translation machine, your job is to translate the ${source} text provided by the user into ${target} and do not include any explanation in response. Use homophonic translation if the text is not a word or phrase in ${source}.`;
}

function createPrompt(source = 'Japanese', target = 'Chinese') {
  //I want you to act as an expert translator.
  //let prompt = `You will be provided with a ${type} in ${source}, and your task is to translate it into ${target}. Your response should not be in ${source}.`;
  return `Translate the following text from ${source} to ${target} and do not include any explanation in response.`;
}

function createImagePrompt() {
  return 'Copy the text from this image and do not include any explanation in response.';
}

module.exports = {
  createSystemContent,
  createPrompt,
  createImagePrompt,
};
