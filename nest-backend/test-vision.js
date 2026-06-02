const { ChatOpenAI } = require('@langchain/openai');

async function testModel(modelName) {
  console.log(`Testing model: ${modelName}`);
  try {
    const model = new ChatOpenAI({
      configuration: {
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey: 'sk-987d3d185cee4df58f78ef975f15c5e7',
      },
      model: modelName,
      temperature: 0.7,
      streaming: true,
    });
    const stream = await model.stream([
      { role: 'user', content: '你好，请用一句话回复' }
    ]);
    let result = '';
    for await (const chunk of stream) {
      if (typeof chunk.content === 'string') result += chunk.content;
    }
    console.log(`  OK: ${result}\n`);
  } catch (e) {
    console.log(`  FAIL: ${e.message}\n`);
  }
}

(async () => {
  await testModel('qwen-vl-plus');
  await testModel('qwen-vl-max');
  await testModel('qwen2.5-vl-72b-instruct');
  await testModel('qwen-plus');
})();
