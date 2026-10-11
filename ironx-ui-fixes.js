/* IRONX UI recovery patch. Load this after the main inline application script. */
(function () {
  'use strict';
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.name = 'viewport';
    document.head.appendChild(viewport);
  }
  viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';

  const style = document.createElement('style');
  style.id = 'ironx-ui-recovery-css';
  style.textContent = `
    html, body { width:100%; max-width:100%; overflow-x:hidden; }
    #app, .main, .page, .section, .account-card, .coach-dashboard, .chat-layout,
    .nutrition-layout, .nutrition-card, .coach-panel, .hero, .topbar { min-width:0; max-width:100%; box-sizing:border-box; }
    img, video, canvas, iframe, table { max-width:100%; }
    input, textarea, select, button { max-width:100%; box-sizing:border-box; }
    .coach-dashboard { grid-template-columns:minmax(0, 300px) minmax(0, 1fr); }
    .chat-layout { grid-template-columns:minmax(0, 280px) minmax(0, 1fr); }
    .client-list, .chat-list { min-width:0; }
    .client-item, .chat-user { overflow-wrap:anywhere; }
    @media (max-width: 900px) {
      .sidebar { display:none !important; }
      .main { margin:0 !important; padding:16px 12px 100px !important; width:100% !important; }
      .coach-dashboard, .chat-layout, .nutrition-layout, .progress-layout,
      .profile-grid, .calc-grid, .feature-grid, .plan-grid, .lift-grid { grid-template-columns:minmax(0,1fr) !important; }
      .stats { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
      .nutrition-summary, .macro-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
      .hero { min-height:auto !important; padding:24px 18px !important; }
      .hero-title { font-size:clamp(42px, 13vw, 72px) !important; overflow-wrap:anywhere; }
      .topbar { gap:10px; align-items:flex-start; }
      .topbar-right { gap:6px; flex-wrap:wrap; justify-content:flex-end; }
      .coach-panel, .chat-panel, .nutrition-card, .profile-card, .account-card { padding:14px !important; }
      .chat-box { height:auto !important; min-height:360px; }
      .chat-messages { min-height:180px; max-height:45vh; overflow:auto; }
      .mobile-nav { display:flex; }
      .section-head h2 { overflow-wrap:anywhere; }
    }
    @media (max-width: 420px) {
      .main { padding-left:10px !important; padding-right:10px !important; }
      .stats { gap:8px !important; }
      .stat { padding:12px !important; }
      .auth-card { padding:22px 16px !important; }
      .nutrition-summary, .macro-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
      .topbar .welcome-title { font-size:25px !important; }
    }
    .ironx-empty-state { border:1px dashed var(--border, rgba(255,255,255,.18)); border-radius:16px; padding:16px; color:var(--muted,#a5acb8); font-size:13px; line-height:1.6; }
  `;
  document.head.appendChild(style);

  const $ = id => document.getElementById(id);
  const safe = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  // Override the existing loader so the coach dashboard has an honest empty state.
  window.loadClients = async function () {
    const list = $('clientList');
    if (!list || typeof supabaseClient === 'undefined' || !currentUser) return;
    if (currentProfile?.role !== 'coach') return;
    list.innerHTML = '<div class="ironx-empty-state">Loading clients…</div>';
    try {
      const { data, error } = await supabaseClient.from('profiles')
        .select('id, full_name, role, created_at').eq('role', 'client').order('created_at', { ascending: false });
      if (error) throw error;
      if (!Array.isArray(data) || data.length === 0) {
        list.innerHTML = '<div class="ironx-empty-state"><strong>No clients yet.</strong><br>New client accounts will appear here after they register successfully.</div>';
        const empty = $('coachEmptyState');
        const editor = $('coachEditor');
        if (empty) {
          empty.classList.remove('hidden');
          empty.innerHTML = '<h3>No clients yet</h3><p style="color:var(--muted);margin-top:8px;">There are no client accounts to manage. When a client registers, they will appear here automatically.</p>';
        }
        if (editor) editor.classList.add('hidden');
        return;
      }
      list.innerHTML = '';
      data.forEach(client => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'client-item'; button.dataset.clientId = client.id;
        button.innerHTML = '<strong>' + safe(client.full_name || 'Unnamed client') + '</strong><small>Client account</small>';
        button.addEventListener('click', () => selectClient?.(client));
        list.appendChild(button);
      });
    } catch (error) {
      console.error('IRONX client list error:', error);
      list.innerHTML = '<div class="ironx-empty-state">Could not load clients. Check the profiles table permissions in Supabase.</div>';
    }
  };

  // Replaces the broken/empty chat selector with a clear status and safely reports database errors.
  window.loadChatUsers = async function () {
    const box = $('chatUserList');
    if (!box || !currentUser || typeof supabaseClient === 'undefined') return;
    const role = currentProfile?.role === 'coach' ? 'coach' : 'client';
    box.innerHTML = '<div class="ironx-empty-state">Loading conversation…</div>';
    try {
      let query = supabaseClient.from('profiles').select('id, full_name, role');
      if (role === 'coach') query = query.eq('role', 'client').order('created_at', { ascending: false });
      else query = query.eq('role', 'coach').limit(1);
      const { data, error } = await query;
      if (error) throw error;
      const people = Array.isArray(data) ? data : (data ? [data] : []);
      if (!people.length) {
        box.innerHTML = '<div class="ironx-empty-state">' + (role === 'coach' ? 'No clients yet. A conversation will appear when a client account is created.' : 'The coach account was not found. Ask the site owner to check the coach profile role.') + '</div>';
        if ($('chatTitle')) $('chatTitle').textContent = 'No conversation yet';
        if ($('chatMessages')) $('chatMessages').innerHTML = '';
        if ($('chatInput')) $('chatInput').disabled = true;
        if ($('chatSendButton')) $('chatSendButton').disabled = true;
        return;
      }
      if ($('chatInput')) $('chatInput').disabled = false;
      if ($('chatSendButton')) $('chatSendButton').disabled = false;
      box.innerHTML = '';
      people.forEach(person => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'chat-user'; button.dataset.userId = person.id;
        button.innerHTML = '<strong>' + safe(person.full_name || (role === 'coach' ? 'Client' : 'Coach')) + '</strong>';
        button.addEventListener('click', () => openChat?.(person));
        box.appendChild(button);
      });
      if (!selectedChatUserId && people[0]) openChat?.(people[0]);
    } catch (error) {
      console.error('IRONX chat contacts error:', error);
      box.innerHTML = '<div class="ironx-empty-state">Could not load chat contacts. Check the profiles and coach_messages table permissions in Supabase.</div>';
    }
  };

  // Keep the chat from looking active when there is no selected recipient.
  const originalSend = window.sendChatMessage;
  window.sendChatMessage = async function () {
    if (!$('chatInput') || !$('chatInput').value.trim()) return;
    if (!selectedChatUserId) {
      if ($('chatStatus')) $('chatStatus').textContent = 'Choose a conversation first.';
      return;
    }
    if (typeof originalSend === 'function') return originalSend();
  };

  document.addEventListener('DOMContentLoaded', () => {
    const empty = $('coachEmptyState');
    const list = $('clientList');
    if (empty && list && !list.querySelector('.client-item')) {
      const title = empty.querySelector('h3');
      if (title && /select a client/i.test(title.textContent)) title.textContent = 'No clients yet';
    }
  });
})();
