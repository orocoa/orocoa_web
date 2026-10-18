const skipIntro = location.hash === '#fields';
    if (skipIntro) {
      document.documentElement.dataset.entry = 'fields';
      // The chapter owns this destination; native restoration can otherwise
      // overwrite it after pageshow with a half-finished zoom position.
      history.scrollRestoration = 'manual';
    }
    else document.documentElement.dataset.intro='loading';
    window.__homeIntroBoot={skip:skipIntro,startedAt:performance.now(),fail(){
      if(!document.documentElement.dataset.intro)return;
      document.documentElement.dataset.intro='error';
      const overlay=document.querySelector('#home-loader');
      if(overlay){overlay.setAttribute('role','group');overlay.setAttribute('aria-label',document.documentElement.lang==='zh-CN'?'加载失败':'Loading failed');}
      const message=document.querySelector('.loader-error');if(message)message.hidden=false;
    }};
    if (!skipIntro) window.__homeIntroBoot.watchdog=setTimeout(()=>window.__homeIntroBoot.fail(),30000);
