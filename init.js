// init.js — Supabase CDN yükleme ve fallback mekanizması
// index.html'deki inline script'ten taşındı (CSP unsafe-inline kaldırmak için)
(function(){
    var maxWait=5000,interval=300,elapsed=0;
    function check(){
        if(typeof supabase!=='undefined'){console.log('✅ Supabase library loaded');return}
        elapsed+=interval;
        if(elapsed<maxWait){setTimeout(check,interval);return}
        console.warn('Supabase CDN yuklenemedi, dinamik retry...');
        var urls=[
            'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
            'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js',
            'https://cdn.skypack.dev/@supabase/supabase-js@2/dist/umd/supabase.min.js'
        ];
        var i=0;
        function tryNext(){
            if(i>=urls.length){console.error('Supabase: tum kaynaklar basarisiz');return}
            var s=document.createElement('script');
            s.src=urls[i]+'?t='+Date.now();
            s.crossOrigin='anonymous';
            s.onload=function(){console.log('✅ Supabase dinamik yuklendi:',urls[i])};
            s.onerror=function(){i++;tryNext()};
            document.head.appendChild(s);
        }
        tryNext();
    }
    setTimeout(check,interval);
})();
