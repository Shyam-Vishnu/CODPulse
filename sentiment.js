// minimal sentiment (lexicon + emojis)
const AFINN = {"good":3,"great":4,"amazing":4,"awesome":4,"love":3,"win":2,"victory":3,"wow":3,"bad":-2,"worse":-3,"worst":-4,"hate":-3,"bug":-2,"broken":-3,"issue":-1,"nerf":-2,"crash":-3,"fix":1,"update":1,"buff":2,"problem":-2,"lag":-2,"smooth":2,"fast":2,"slow":-2,"cheater":-3,"hack":-3,"ban":1,"banned":1,"glitch":-2,"fun":2,"boring":-2,"trash":-3,"sucks":-3,"lit":2,"fire":2,"unplayable":-4,"balanced":2,"unbalanced":-2,"pay2win":-2,"reward":2,"rewarding":2,"grind":-1,"laggy":-2,"dead":-2,"alive":1,"server":-1,"servers":-1,"matchmaking":-1,"stutter":-2};
const EMOJI = {"😀":2,"😄":3,"😁":3,"😍":3,"🔥":2,"👍":2,"👏":2,"🎉":3,"😕":-1,"😞":-2,"😡":-3,"🤬":-4,"💀":-2,"👎":-2,"😭":-2,"🤡":-2,"💩":-3};
function tokenize(t){return (t||"").toLowerCase().replace(/https?:\/\/\S+/g,'').replace(/[^a-z0-9\s'-]/g,' ').split(/\s+/).filter(Boolean)}
function scoreLexicon(text){const toks=tokenize(text);let s=0;for(const t of toks){if(AFINN[t]) s+=AFINN[t];}for(const ch of (text||'')){if(EMOJI[ch]) s+=EMOJI[ch];}return s/2;}
async function sentiment(text){return {score:scoreLexicon(text)};}
