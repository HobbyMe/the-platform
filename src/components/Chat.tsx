import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Mic, Video, Image, X } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  type: 'text' | 'audio' | 'video';
  media_url: string | null;
  created_at: string;
  sender_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface ChatProps {
  recipientId: string;
  onClose: () => void;
}

export default function Chat({ recipientId, onClose }: ChatProps) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    initializeChat();
    return () => {
      if (mediaRecorder) {
        mediaRecorder.removeEventListener('dataavailable', handleDataAvailable);
        mediaRecorder.removeEventListener('stop', handleStop);
      }
    };
  }, [recipientId]);

  useEffect(() => {
    if (chatId) {
      const subscription = supabase
        .channel(`chat:${chatId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        }, payload => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    try {
      // Find existing chat or create new one
      const { data: existingChat } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .in('user_id', [session?.user.id, recipientId])
        .order('joined_at', { ascending: false });

      let currentChatId;

      if (existingChat && existingChat.length >= 2) {
        currentChatId = existingChat[0].chat_id;
      } else {
        // Create new chat
        const { data: newChat } = await supabase
          .from('chats')
          .insert({})
          .select()
          .single();

        if (newChat) {
          currentChatId = newChat.id;
          // Add participants
          await supabase.from('chat_participants').insert([
            { chat_id: currentChatId, user_id: session?.user.id },
            { chat_id: currentChatId, user_id: recipientId }
          ]);
        }
      }

      if (currentChatId) {
        setChatId(currentChatId);
        // Fetch messages
        const { data: messagesData } = await supabase
          .from('messages')
          .select(`
            *,
            profiles:sender_id (
              username,
              avatar_url
            )
          `)
          .eq('chat_id', currentChatId)
          .order('created_at', { ascending: true });

        if (messagesData) {
          setMessages(messagesData);
        }
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string, type: 'text' | 'audio' | 'video' = 'text', mediaUrl: string | null = null) => {
    if (!chatId || (!content && !mediaUrl)) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: session?.user.id,
          content,
          type,
          media_url: mediaUrl
        });

      if (error) throw error;
      
      if (type === 'text') {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const startRecording = async (mediaType: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mediaType === 'video'
      });

      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      chunks.current = [];

      recorder.addEventListener('dataavailable', handleDataAvailable);
      recorder.addEventListener('stop', () => handleStop(mediaType));

      recorder.start();
      setRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleDataAvailable = (e: BlobEvent) => {
    chunks.current.push(e.data);
  };

  const handleStop = async (mediaType: 'audio' | 'video') => {
    const blob = new Blob(chunks.current, {
      type: mediaType === 'audio' ? 'audio/webm' : 'video/webm'
    });

    try {
      const filename = `${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(filename, blob);

      if (error) throw error;

      if (data) {
        const { data: { publicUrl } } = supabase.storage
          .from('chat-media')
          .getPublicUrl(filename);

        await sendMessage('', mediaType, publicUrl);
      }
    } catch (error) {
      console.error('Error uploading media:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Chat</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_id === session?.user.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.sender_id === session?.user.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-sm mb-1">
                  {message.profiles.username}
                </div>
                {message.type === 'text' && (
                  <p>{message.content}</p>
                )}
                {message.type === 'audio' && message.media_url && (
                  <audio controls className="w-full">
                    <source src={message.media_url} type="audio/webm" />
                  </audio>
                )}
                {message.type === 'video' && message.media_url && (
                  <video controls className="w-full rounded">
                    <source src={message.media_url} type="video/webm" />
                  </video>
                )}
                <div className="text-xs mt-1 opacity-70">
                  {new Date(message.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(newMessage);
                }
              }}
            />
            
            {!recording ? (
              <>
                <button
                  onClick={() => startRecording('audio')}
                  className="p-2 text-gray-600 hover:text-indigo-600 rounded-full hover:bg-gray-100"
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  onClick={() => startRecording('video')}
                  className="p-2 text-gray-600 hover:text-indigo-600 rounded-full hover:bg-gray-100"
                >
                  <Video className="h-5 w-5" />
                </button>
                <button
                  onClick={() => sendMessage(newMessage)}
                  className="p-2 text-white bg-indigo-600 rounded-full hover:bg-indigo-700"
                >
                  <Send className="h-5 w-5" />
                </button>
              </>
            ) : (
              <button
                onClick={stopRecording}
                className="p-2 text-white bg-red-600 rounded-full hover:bg-red-700"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}