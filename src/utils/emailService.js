import { supabase } from '../supabaseClient';

/**
 * Fire-and-forget email helpers.
 * Each function calls the send-email Edge Function and logs errors
 * to console without blocking the UI.
 */

async function send(body) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('Email send skipped: no active session');
      return;
    }
    const { error } = await supabase.functions.invoke('send-email', {
      body,
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) console.error('Email send failed:', error);
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

export function sendInvitationEmail(to, communityName, inviteCode, description, personalMessage) {
  send({
    to,
    type: 'invitation',
    data: { communityName, inviteCode, description: description || '', personalMessage: personalMessage || '' },
  });
}

export function sendJoinConfirmation(userId, username, communityName) {
  send({
    userId,
    type: 'join_confirmation',
    data: { username, communityName },
  });
}

export function sendQuestionNotification(userId, username, questionText, status, rejectionReason) {
  send({
    userId,
    type: 'question_notification',
    data: { username, questionText, status, rejectionReason: rejectionReason || '' },
  });
}

export function sendGenericEmail(userId, username, subject, message) {
  send({
    userId,
    type: 'generic',
    data: { username, subject, message },
  });
}
