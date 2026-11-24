/**
 * AppSafe Professional International Search Engine
 * Features:
 * - Real-time instantaneous filtering (zero lag)
 * - Full Unicode normalization & international diacritics / accent insensitivity (é, ü, ñ, ø, etc.)
 * - Typo tolerance & fuzzy matching via Levenshtein distance
 * - Single letter, partial word, multi-word, and acronym matching (e.g., COD, RL)
 * - Relevance scoring with intelligent sorting
 * - Clean "No matching applications found" state
 * - Compatible with all pages containing #filter / #live-search
 */
(function($) {
  'use strict';

  // Common gaming aliases and keywords for rich discovery
  var ALIASES = {
    'rl-sideswipe-hack': 'rocket league car soccer psyonix football',
    'cod-mobile-mod-menu': 'call of duty activision warzone fps shooter shooter mobile',
    'call-of-duty-hack': 'cod activision warzone shooter fps',
    'brawl-stars-hack': 'supercell moba brawler gems hero',
    'badland-brawl-hack': 'frogmind physics slingshot',
    'free-fire-hack': 'garena battle royale pubg survivor diamonds ff',
    'block-craft-3d-hack': 'minecraft sandbox voxel building blocks crafting',
    '8-ball-pool-hack': 'billiards miniclip snooker cues 8ball pool',
    'pokemon-unite-hack': 'pocket monsters pikachu nintendo tencent moba unite',
    'mario-kart-tour-hack': 'nintendo racing kart tour speed',
    'asphalt-9-hack': 'gameloft racing nitro cars supercars legends',
    'hill-climb-racing-hack': 'fingersoft physics car drive hillclimb vehicles',
    'cats-crash-arena-hack': 'zeptolab battle cars robots pvp arena turbo stars',
    'stumble-guys-hack': 'fall guys multiplayer knockout obstacle royale stumble',
    'tiktok-plus-plus': 'social video sharing musical ly douyin tt',
    'google-play-plus-plus': 'android playstore market apps google gplay store',
    'app-store-plus-plus': 'ios appstore itunes apple appstore plus'
  };

  function removeDiacritics(str) {
    if (!str) return '';
    try {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ß/g, 'ss')
        .replace(/æ/g, 'ae')
        .replace(/œ/g, 'oe')
        .replace(/ø/g, 'o')
        .replace(/đ/g, 'd')
        .replace(/ł/g, 'l');
    } catch (e) {
      return str;
    }
  }

  function cleanAlphanumeric(str) {
    if (!str) return '';
    var cleaned = removeDiacritics(str).toLowerCase();
    cleaned = cleaned.replace(/&/g, ' and ').replace(/\+/g, ' plus ');
    cleaned = cleaned.replace(/[^a-z0-9\s]/g, ' ');
    return cleaned.replace(/\s+/g, ' ').trim();
  }

  function rawNormalized(str) {
    if (!str) return '';
    return removeDiacritics(str).toLowerCase().trim();
  }

  function levenshteinDistance(s1, s2) {
    if (s1 === s2) return 0;
    var len1 = s1.length;
    var len2 = s2.length;
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;
    if (len1 > len2) {
      var t = s1; s1 = s2; s2 = t;
      len1 = s1.length; len2 = s2.length;
    }
    var prevRow = new Array(len1 + 1);
    for (var i = 0; i <= len1; i++) prevRow[i] = i;

    for (var j = 1; j <= len2; j++) {
      var curRow = new Array(len1 + 1);
      curRow[0] = j;
      var c2 = s2.charCodeAt(j - 1);
      for (var k = 1; k <= len1; k++) {
        var cost = s1.charCodeAt(k - 1) === c2 ? 0 : 1;
        curRow[k] = Math.min(
          curRow[k - 1] + 1,
          prevRow[k] + 1,
          prevRow[k - 1] + cost
        );
      }
      prevRow = curRow;
    }
    return prevRow[len1];
  }

  $(document).ready(function() {
    var $input = $('#filter');
    if (!$input.length) return;

    var $form = $('#live-search');
    var $gridWrapper = $('.app-line-grid-wrapper');
    var $gridList = $gridWrapper.find('ul.app-line-grid');
    var $items = $gridList.find('li.app-line-grid-item');

    if (!$items.length) return;

    // Prevent enter key from submitting form or refreshing page
    $form.on('submit', function(e) {
      e.preventDefault();
      return false;
    });

    // Create No Results element if not present
    var $noResults = $('#no-search-results');
    if (!$noResults.length) {
      $noResults = $(
        '<div id="no-search-results" style="display:none;padding:35px 20px;text-align:center;color:#aaa;background:#15151e;border:1px solid rgba(255,255,255,0.08);border-radius:14px;margin:25px auto;max-width:620px;">' +
          '<i class="fas fa-search" style="font-size:2.2rem;color:#00ff88;margin-bottom:14px;display:block;" aria-hidden="true"></i>' +
          '<div style="font-size:1.15rem;color:#fff;font-weight:700;margin-bottom:8px;">No applications found</div>' +
          '<p style="font-size:0.86rem;color:#888;margin:0 0 16px 0;">No matching mods found for "<span class="no-results-query" style="color:#00ff88;font-weight:600;"></span>". Try checking for typos or searching by feature (e.g. "Brawl", "Coins", "Action").</p>' +
          '<button type="button" class="clear-search-btn" style="background:rgba(0,255,136,0.15);color:#00ff88;border:1px solid rgba(0,255,136,0.4);padding:8px 20px;border-radius:6px;cursor:pointer;font-size:0.85rem;font-weight:700;transition:all 0.2s ease;">Clear Search</button>' +
        '</div>'
      );
      $gridWrapper.append($noResults);
    }

    $noResults.on('click', '.clear-search-btn', function() {
      $input.val('').focus();
      executeSearch('');
    });

    // Build fast in-memory search index
    var searchIndex = [];
    $items.each(function(index) {
      var $el = $(this);
      var rawTitle = $el.find('.app-title').text() || '';
      var rawDesc = $el.find('.app-description').text() || '';
      var rawAuthor = $el.find('.app-author').text() || '';
      var rawSlug = $el.attr('data-slug') || '';
      var aliasText = ALIASES[rawSlug] || '';

      var cleanTitle = cleanAlphanumeric(rawTitle);
      var cleanDesc = cleanAlphanumeric(rawDesc);
      var cleanAuthor = cleanAlphanumeric(rawAuthor);
      var cleanSlug = cleanAlphanumeric(rawSlug);
      var cleanAlias = cleanAlphanumeric(aliasText);

      var titleWords = cleanTitle.split(' ').filter(Boolean);
      var descWords = cleanDesc.split(' ').filter(Boolean);
      var authorWords = cleanAuthor.split(' ').filter(Boolean);
      var aliasWords = cleanAlias.split(' ').filter(Boolean);
      var allWords = titleWords.concat(descWords, authorWords, aliasWords);

      var acronym = titleWords.map(function(w) { return w.charAt(0); }).join('');

      searchIndex.push({
        el: this,
        $el: $el,
        originalIndex: index,
        rawTitle: rawTitle,
        cleanTitle: cleanTitle,
        cleanDesc: cleanDesc,
        cleanAuthor: cleanAuthor,
        cleanSlug: cleanSlug,
        cleanAlias: cleanAlias,
        titleWords: titleWords,
        descWords: descWords,
        allWords: allWords,
        acronym: acronym,
        combinedRaw: (rawNormalized(rawTitle) + ' ' + rawNormalized(rawDesc) + ' ' + rawNormalized(rawSlug) + ' ' + rawNormalized(rawAuthor)).toLowerCase(),
        combinedClean: (cleanTitle + ' ' + cleanDesc + ' ' + cleanSlug + ' ' + cleanAuthor + ' ' + cleanAlias).toLowerCase()
      });
    });

    function executeSearch(query) {
      var trimmed = (query || '').trim();
      if (!trimmed) {
        // Restore all items and original order
        searchIndex.sort(function(a, b) {
          return a.originalIndex - b.originalIndex;
        });
        for (var i = 0; i < searchIndex.length; i++) {
          searchIndex[i].$el.show();
          $gridList.append(searchIndex[i].el);
        }
        $gridList.show();
        $noResults.hide();
        return;
      }

      var cleanQ = cleanAlphanumeric(trimmed);
      var rawQ = rawNormalized(trimmed);
      var tokens = cleanQ.split(' ').filter(Boolean);
      if (!tokens.length) {
        tokens = [rawQ];
      }

      var matchedItems = [];

      for (var idx = 0; idx < searchIndex.length; idx++) {
        var item = searchIndex[idx];
        var itemScore = 0;
        var allTokensMatched = true;

        for (var t = 0; t < tokens.length; t++) {
          var tok = tokens[t];
          var tokLen = tok.length;
          var tokMatched = false;
          var tokScore = 0;

          // 1. Single letter query
          if (tokLen === 1) {
            if (item.cleanTitle.indexOf(tok) !== -1) {
              tokMatched = true;
              tokScore += 200;
              if (item.cleanTitle.indexOf(tok) === 0) tokScore += 100;
            } else if (item.cleanDesc.indexOf(tok) !== -1 || item.cleanAuthor.indexOf(tok) !== -1) {
              tokMatched = true;
              tokScore += 50;
            } else if (item.combinedRaw.indexOf(tok) !== -1) {
              tokMatched = true;
              tokScore += 20;
            }
          }
          // 2. Short query (2 letters)
          else if (tokLen === 2) {
            if (item.cleanTitle === tok) {
              tokMatched = true;
              tokScore += 500;
            } else if (item.cleanTitle.indexOf(tok) === 0) {
              tokMatched = true;
              tokScore += 350;
            } else if (item.cleanTitle.indexOf(tok) !== -1) {
              tokMatched = true;
              tokScore += 250;
            } else if (item.acronym === tok || item.acronym.indexOf(tok) === 0) {
              tokMatched = true;
              tokScore += 300;
            } else if (item.cleanDesc.indexOf(tok) !== -1 || item.cleanAuthor.indexOf(tok) !== -1) {
              tokMatched = true;
              tokScore += 100;
            } else if (item.combinedRaw.indexOf(tok) !== -1) {
              tokMatched = true;
              tokScore += 50;
            }
          }
          // 3. Multi-character query (3+ letters)
          else {
            // Direct title checks
            if (item.cleanTitle === tok) {
              tokMatched = true;
              tokScore += 1000;
            } else if (item.cleanTitle.indexOf(tok) === 0) {
              tokMatched = true;
              tokScore += 600;
            } else if (item.cleanTitle.indexOf(' ' + tok) !== -1) {
              tokMatched = true;
              tokScore += 450;
            } else if (item.cleanTitle.indexOf(tok) !== -1) {
              tokMatched = true;
              tokScore += 300;
            }

            // Concatenated title without spaces (e.g., "mariokart" -> "Mario Kart")
            var collapsedTitle = item.cleanTitle.replace(/\s+/g, '');
            if (collapsedTitle === tok || collapsedTitle.indexOf(tok) !== -1) {
              tokMatched = true;
              tokScore += 450;
            }

            // Word-level checks
            for (var wIdx = 0; wIdx < item.titleWords.length; wIdx++) {
              var w = item.titleWords[wIdx];
              if (w === tok) {
                tokMatched = true;
                tokScore += 500;
              } else if (w.indexOf(tok) === 0) {
                tokMatched = true;
                tokScore += 300;
              } else if (w.indexOf(tok) !== -1 && tokLen >= 3) {
                tokMatched = true;
                tokScore += 200;
              }
            }

            // Description, author, slug, alias
            if (!tokMatched) {
              if (item.cleanDesc.indexOf(tok) !== -1) {
                tokMatched = true;
                tokScore += 150;
              } else if (
                item.cleanAuthor.indexOf(tok) !== -1 ||
                item.cleanSlug.indexOf(tok) !== -1 ||
                item.cleanAlias.indexOf(tok) !== -1
              ) {
                tokMatched = true;
                tokScore += 120;
              } else if (item.combinedRaw.indexOf(tok) !== -1 || item.combinedClean.indexOf(tok) !== -1) {
                tokMatched = true;
                tokScore += 100;
              }
            }

            // Acronym check (e.g. "cod" -> Call of Duty)
            if (item.acronym === tok || (tokLen >= 2 && item.acronym.indexOf(tok) === 0)) {
              tokMatched = true;
              tokScore += 350;
            }

            // Typo tolerance / Levenshtein Distance
            if (!tokMatched) {
              var maxDist = tokLen <= 3 ? 0 : (tokLen <= 5 ? 1 : (tokLen <= 8 ? 2 : 3));
              if (maxDist > 0) {
                var bestDist = 999;
                for (var twIdx = 0; twIdx < item.titleWords.length; twIdx++) {
                  var tw = item.titleWords[twIdx];
                  var dist = levenshteinDistance(tok, tw);
                  if (dist <= maxDist && dist < bestDist) {
                    bestDist = dist;
                    tokMatched = true;
                    tokScore += Math.max(60, 200 - dist * 50);
                  }
                  if (tw.length > tokLen) {
                    var twSub = tw.substring(0, tokLen);
                    var distSub = levenshteinDistance(tok, twSub);
                    if (distSub <= 1) {
                      tokMatched = true;
                      tokScore += 100;
                    }
                  }
                }

                if (!tokMatched) {
                  for (var awIdx = 0; awIdx < item.allWords.length; awIdx++) {
                    var aw = item.allWords[awIdx];
                    var awDist = levenshteinDistance(tok, aw);
                    if (awDist <= maxDist && awDist < bestDist) {
                      bestDist = awDist;
                      tokMatched = true;
                      tokScore += Math.max(40, 150 - awDist * 40);
                      break;
                    }
                  }
                }
              }
            }
          }

          if (!tokMatched) {
            allTokensMatched = false;
            break;
          } else {
            itemScore += tokScore;
          }
        }

        if (allTokensMatched && itemScore > 0) {
          matchedItems.push({
            item: item,
            score: itemScore
          });
        }
      }

      // Hide all items first
      $items.hide();

      if (matchedItems.length === 0) {
        $gridList.hide();
        $noResults.find('.no-results-query').text(trimmed);
        $noResults.show();
      } else {
        $noResults.hide();
        $gridList.show();

        // Sort descending by score
        matchedItems.sort(function(a, b) {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return a.item.originalIndex - b.item.originalIndex;
        });

        // Reorder DOM and display matching elements immediately
        for (var m = 0; m < matchedItems.length; m++) {
          var matched = matchedItems[m].item;
          matched.$el.show();
          $gridList.append(matched.el);
        }
      }
    }

    // Instant event listeners for maximum punctuality
    $input.on('input keyup keydown change paste cut search', function(e) {
      if (e.keyCode === 27) { // Escape key
        $(this).val('');
        executeSearch('');
        return;
      }
      executeSearch($(this).val());
    });

  });
})(jQuery);
