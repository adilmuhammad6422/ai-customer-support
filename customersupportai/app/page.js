'use client'

import { Box, Button, Stack, TextField } from '@mui/material'
import { useState, useRef, useEffect } from 'react'

// Define the maximum number of messages to keep in the chat window
const MAX_MESSAGES = 50;

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm the Headstarter support assistant. How can I help you today?",
    },
  ]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;
    setIsLoading(true);
    setMessage('');
    setError(null); // Reset error state

    // Update messages with the new user message and a placeholder for the assistant's response
    setMessages((prevMessages) => {
      const newMessages = [
        ...prevMessages,
        { role: 'user', content: message },
        { role: 'assistant', content: '' },
      ];
      
      // Ensure we only keep the latest MAX_MESSAGES
      return newMessages.slice(-MAX_MESSAGES);
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, { role: 'user', content: message }]),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });

        setMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          const updatedMessages = [
            ...prevMessages.slice(0, -1),
            { ...lastMessage, content: lastMessage.content + text },
          ];

          // Ensure we only keep the latest MAX_MESSAGES
          return updatedMessages.slice(-MAX_MESSAGES);
        });
      }
    } catch (error) {
      console.error('Error:', error);
      let errorMessage;

      if (error.message.includes('Network')) {
        errorMessage = "Network issue. Please check your connection.";
      } else if (error.message.includes('API')) {
        errorMessage = "API error. Please try again later.";
      } else {
        errorMessage = "An unexpected error occurred.";
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: errorMessage },
      ]);
      setError(errorMessage); // Set error message for display
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleRetry = () => {
    sendMessage();
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <Stack
        direction={'column'}
        width="500px"
        height="700px"
        border="1px solid black"
        p={2}
        spacing={3}
      >
        <Stack
          direction={'column'}
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === 'assistant' ? 'flex-start' : 'flex-end'
              }
            >
              <Box
                bgcolor={
                  message.role === 'assistant'
                    ? 'primary.main'
                    : 'secondary.main'
                }
                color="white"
                borderRadius={16}
                p={3}
              >
                {message.content}
              </Box>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Stack>
        {error && (
          <Stack direction={'row'} spacing={2} mt={2}>
            <Box bgcolor="error.main" color="white" borderRadius={16} p={2}>
              {error}
            </Box>
            <Button 
              variant="outlined" 
              onClick={handleRetry}
              disabled={isLoading}
            >
              {isLoading ? 'Retrying...' : 'Retry'}
            </Button>
          </Stack>
        )}
        <Stack direction={'row'} spacing={2} mt={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            InputProps={{
              style: { color: 'white' } // Set text color to white
            }}
          />
          <Button 
            variant="contained" 
            onClick={sendMessage}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
