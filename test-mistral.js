const { Mistral } = require('@mistralai/mistralai');
require('dotenv').config();

// Log the structure of the Mistral client
const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || 'dummy-key',
});

// Log the client structure
console.log('Client properties:', Object.keys(client));

// Check the prototype chain
console.log('\nPrototype chain:');
let proto = Object.getPrototypeOf(client);
while (proto) {
  console.log('- Properties:', Object.getOwnPropertyNames(proto));
  proto = Object.getPrototypeOf(proto);
}

// Check if chat is a function or an object
console.log('\nType of client.chat:', typeof client.chat);
if (typeof client.chat === 'object') {
  console.log('Chat properties:', Object.keys(client.chat));

  // Check the prototype of chat
  const chatProto = Object.getPrototypeOf(client.chat);
  if (chatProto) {
    console.log(
      'Chat prototype properties:',
      Object.getOwnPropertyNames(chatProto),
    );
  }
}

// Check for methods on the client
console.log('\nClient methods:');
const clientMethods = Object.getOwnPropertyNames(
  Object.getPrototypeOf(client),
).filter((prop) => typeof client[prop] === 'function');
console.log(clientMethods);

// Check if there's a method for chat completions
if (typeof client.chatCompletions === 'function') {
  console.log('\nFound chatCompletions method');
} else if (typeof client.chat === 'function') {
  console.log('\nFound chat method');
} else if (typeof client.createChatCompletion === 'function') {
  console.log('\nFound createChatCompletion method');
}

// Check for other methods that might be used for vision/OCR
console.log('\nClient methods for vision/images:');
clientMethods.forEach((method) => {
  if (
    method.toLowerCase().includes('vision') ||
    method.toLowerCase().includes('image') ||
    method.toLowerCase().includes('chat')
  ) {
    console.log(`- ${method}`);
  }
});
