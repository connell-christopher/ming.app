  autoGrow(chatInput);
  if (chatInput.value.trim()) setMingTyping(true);
  else setMingTyping(false);
});
$('#chat-form').addEventListener('submit', async e => {
  e.preventDefault();
  const v = chatInput.value.trim();
  if (!v && !pendingChatAttachment) return;
  setMingTyping(false);
  if (pendingChatAttachment) {
    const file = pendingChatAttachment;
    sendStoredChatAttachment(file, { replyToId: chatReplyTarget?.id || null }).then(() => {
      chatInput.value = '';
      chatInput.style.height = 'auto';
      chatSend.disabled = true;
    });
    return;
  }
  chatInput.value = '';
  chatInput.style.height = 'auto';
  chatSend.disabled = true;
  sendMessage(v, { replyToId: chatReplyTarget?.id || null });
});