"use strict";
/* jshint multistr: true */
/* jshint newcap: false */

/* Fonctions Utiles */
SK.Util = {

    /**
     * Effectue une requête sur l'api WS de JVC
     *
     * @param {string} urlSuffix - suffixe de l'url à requêter sans le ".xml"
     *      Exemple : "forums/1-81-052354-1-0-1-0-0" pour un topic
     *
     * @param {function} callback - Callback appelé avec un objet jQuery représentant
     *   le XML de réponse ou undefined en cas d'erreur
     */
    ws: function(urlSuffix, callback) {

        GM_xmlhttpRequest({
            url: "http://ws.jeuxvideo.com/" + urlSuffix + ".xml",
            method: "GET",
            headers: {
                "Authorization": "Basic YXBwYW5kcjplMzIhY2Rm"
            },
            onload: function(response) {
                var $response;

                try {
                    var xml = $.parseXML(SK.Util.sanitizeXML(response.responseText));
                    $response = $(xml);
                }
                catch(e) {}

                callback($response);
            },
            onerror: function() {
                callback(undefined);
            }
        });
    },

    /**
     * Wrapper de l'API JVC permettant de faire des requêtes simplifiées via un
     * serveur distant.
     *
     * @param {string} requestAction - Type de requête à exécuter : "pseudos"
     * @param {mix} data - données de la requête
     *    pseudos : [ "pseudo1",  "pseudo2", "pseudo3"]
     * @param {function} callback - fonction appelée avec un objet jQuery contenant
     *   les infos récupérées
     * @param {boolean} logApiCall - true (défaut) ou false, si vrai : enregistre
     *   l'appel dans la BDD
     * @param {boolean} forceCacheReload - true ou false (défaut) : si vrai, ne prend
     *   pas en compte le cache et force son rechargement pour l'appel courant
     */
    api: function(requestAction, data, callback, logApiCall, forceCacheReload) {

        callback = callback || function() {};
        logApiCall = (logApiCall === false ? "0" : "1");
        forceCacheReload = (forceCacheReload === false ? "0" : "1");

        var url = SK.config.SERVER_URL + "api-jvc.php?action=" + requestAction +
            "&data=" + encodeURIComponent(JSON.stringify(data)) + "&log=" + logApiCall + "&forceCacheReload=" + forceCacheReload;

        GM_xmlhttpRequest({
            url: url,
            method: "GET",
            onload: function(response) {
                var $xml = $($.parseXML(SK.Util.sanitizeXML(response.responseText)));
                callback($xml);
            }
        });
    },

    apiHelper: {

        /**
         * Retourne des informations liées à un topic.
         *
         * @param {string} topicId - Chaîne identifiant le topic. Ce qui est entre
         *   parenthèses dans l'url suivante :
         *   http://www.jeuxvideo.com/forums/1-(51-65175198)-7-0-1-0-script-jvc-spawnkill-avant-respawn.htm
         * @param {function} callback Fonction appelée avec les infos du topic :
         *   topic : {
         *      pageCount (int),
         *      postCount (int),
         *   }
         *   ou undefined en cas d'erreur
         */
        topicInfos: function(topicId, callback) {

            //Récupération du nombre de pages
            SK.Util.ws("forums/1-" + topicId + "-1-0-1-0-0", function($ws) {
                if(typeof $ws === "undefined") {
                    callback(undefined);
                }
                else {
                    var pageCount = parseInt($ws.find("count_page").text());
                    var lastPageUrl = "forums/1-" + topicId + "-" + pageCount + "-0-1-0-0";

                    //Récupération du nombre de posts de la dernière page
                    SK.Util.ws(lastPageUrl, function($ws) {
                        if(typeof $ws === "undefined") {
                            callback(undefined);
                        }
                        else {
                            var $posts = $("<div>", {
                                html: $ws.find("contenu").text()
                            });
                            var lastPagePostCount = $posts.find("ul").length;
                            var fullPostCount = ((pageCount - 1) * 20) + lastPagePostCount;

                            if(lastPagePostCount === 0) {
                                callback(undefined);
                            }
                            else {
                                callback({
                                    pageCount: pageCount,
                                    postCount: fullPostCount
                                });
                            }
                        }
                    });
                }
            });
        }
    },

    /**
     * Retourne le timestamp Unix courant
     */
    timestamp: function() {
        return Math.round(Date.now() / 1000);
    },

    /**
     * Retourne vrai si l'utilisateur est sur l'une des pages passée en paramètre.
     * pages (SK.common.Pages...) : Liste des pages possibles (voir SK.common.Pages)
     */
    currentPageIn: function(/* SK.common.Pages... */) {

        for (var i = arguments.length - 1; i >= 0; i--) {

            if(SK.common.currentPage === arguments[i]) {
                return true;
            }
        }

        return false;
    },

    /**
     * Affiche une notification très simple (qui disparait toute seule au bout de quelques secondes).
     * @param {String} title Titre de la notification
     * @param {String} text Contenu texte de la notification
     * @param {int} delay Delai en ms avant la disparition de la notification
     */
    notify: function(title, text, delay) {

        delay = delay || 4000;

        var $notification = new SK.Modal({
            title: title,
            content: text,
            buttons: [],
            hasCloseButton: false,
            location: "notification"
        });

        $("#sk-notifications").append($notification);
        SK.Util.fetchStyle($notification);

        $notification.addClass("active");

        //La notification s'efface toute seule après quelques secondes
        setTimeout(function() {

            $notification.on("transitionend webkitTransitionEnd", function() {
                $notification.remove();
            });

            $notification
                .slideUp(400)
                .removeClass("active")
            ;
        }, delay);
    },

    /**
     * Montre une fenêtre modale passée en paramètre sauf si un élément
     * de même id que la modale est présent à l'écran
     */
    showModal: function($modal) {

        var modalId = $modal.attr("id");

        // On n'ouvre pas la modale si un élément de même id est présent à l'écran
        if (typeof modalId !== "undefined" && $("#" + modalId).length > 0) {
            return;
        }

        $("#modals").append($modal);

        SK.Util.fetchStyle($modal);

        $("#modal-loader").hide();

        if(!$modal.hasClass("notification")) {
            $("#modal-background").fadeIn();
        }

        //On appelle l'éventuelle fonction onModalShow de la modale
        $modal.onModalShow();

        $modal.addClass("active");
    },

    /* Affiche l'écran de chargement des modales */
    showModalLoader: function() {
        $("#modal-background").fadeIn();
        $("#modal-loader")
            .css({
                left: ($(window).outerWidth() / 2 - 20) + "px",
                top: ($(window).outerHeight() / 2 - 20) + "px"
            })
            .fadeIn();
    },

    /**
    * Cache toutes les fenêtre modales ouvertes
    * @param {boolean} hideBackground true par défaut, si false,
    *                  le background des modales n'est pas caché.
    */
    hideModal: function(hideBackground) {

        hideBackground = hideBackground === false ? false: true;

        if (hideBackground) {
            $("#modal-background").fadeOut();
        }

        $("#modal-loader").hide();

        var $modals = $("#modals > .modal-box");

        $modals.on("transitionend webkitTransitionEnd", function() {
            $modals.remove();
        });
        $modals.removeClass("active");
    },

    /**
     * Ajoute un bouton au post à l'emplacement indiqué en paramètre
     * dans les options
     *    location: "top" (defaut), "right", ou "bottom"
     *    index (int): position du bouton (de gauche à droite).
     */
    addButton: function($msg, buttonOptions) {

        var location = buttonOptions.location || "top";
        delete buttonOptions.location;
        var index = buttonOptions.index || 0;
        delete buttonOptions.index;

        //On récupère ou on crée le conteneur des boutons
        var $buttons = $msg.find(".buttons." + location);

        if($buttons.length === 0) {

            $buttons = $("<div>", {
                class: "buttons " + location
            });

            //On place la box .buttons en fonction de l'emplacement
            switch(location) {
                case "top":
                    $msg.find(".pseudo > strong").first().after($buttons);
                    break;
                case "bottom":
                    //Si le li .ancre n'existe pas, on la crée
                    var $ancre = $msg.find(".ancre").first();

                    if($ancre.length === 0) {
                        $ancre = $("<li>", {
                            class: "ancre"
                        });
                        $msg.find(".post").after($ancre);
                    }

                    $ancre.append($buttons);
                    break;
                case "right":
                    $msg.find(".date").first().append($buttons);
                    break;
            }

        }

        //On crée le bouton avec les options
        var $button = new SK.Button(buttonOptions);

        $button.hide()
               .attr("data-index", index);

        //On append le bouton à l'index choisi
        var $existingButtons = $buttons.find(".sk-button");

        if($existingButtons.length === 0) {
            $buttons.append($button.fadeIn());
        }
        else {
            $existingButtons.each(function(i) {
                var $existingButton = $(this);

                var existingIndex = parseInt($existingButton.attr("data-index"));
                // $existingButtons.length - 1 === i
                if(index <= existingIndex) {
                    $existingButton.before($button.fadeIn());
                    return false;
                }
                else if($existingButtons.length - 1 === i) {
                    $existingButton.after($button.fadeIn());
                }
            });
        }
    },

    addCss: function(css) {
        if(typeof GM_addStyle === "function") {
            GM_addStyle(css);
        }
        else {
            $("head").append("<style type='text/css' >" + css + "</style>");
        }
    },

    /* permet de supprimer les caractères spéciaux pour éviter les erreurs de parsing */
    sanitizeXML: function(xmlString) {
        var NOT_SAFE_IN_XML_1_0 = /[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm;
        return xmlString.replace(NOT_SAFE_IN_XML_1_0, "");
    },

    //Force le navigateur à recalculer le CSS pour les animations
    fetchStyle: function(element) {

        if(typeof(window.getComputedStyle) == "function") {

            if(element instanceof jQuery) {
                element = element.get(0);
            }
            /* jshint -W030 */
            window.getComputedStyle(element).left;
        }
    },

    /**
     * Ajoute une valeur dans le localStorage ou sessionStorage.
     * Fait le ménage dans les auteurs si ce dernier est plein.
     *
     * @param {boolean} temporary Vrai si la valeur doit être stockée en sessionStorage
     */
    setValue: function(key, value, temporary) {

        temporary = temporary || false;

        key = "SK." + key;

        // Gestion du localStorage plein
        try {
            if (temporary) {
                sessionStorage.setItem(key, JSON.stringify(value));
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
        }
        catch(e) {
            if(e.name === "QUOTA_EXCEEDED_ERR") {
                // On supprime les données obsolètes des auteurs
                SK.Author.clearObsoleteData();
            }
        }
    },

    /**
     * Récupère une valeur du localStorage ou sessionStorage.
     *
     * @param {boolean} temporary Vrai si la valeur doit être récupérée en sessionStorage
     *
     * @return null si la donnée n'existe pas
     */
    getValue: function(key, temporary) {

        temporary = temporary || false;
        key = "SK." + key;

        var item = null;

		if (temporary) {
			item = sessionStorage.getItem(key);
		} else {
			item = localStorage.getItem(key);
		}

        return JSON.parse(item);
    },

    /**
     * Supprime une valeur du localStorage ou sessionStorage.
     *
     * @param {boolean} temporary Vrai si la valeur doit être supprimé du sessionStorage
     */
    deleteValue: function(key, temporary) {

        temporary = temporary || false;

        key = "SK." + key;

		if (temporary) {
			sessionStorage.removeItem(key);
		} else {
			localStorage.removeItem(key);
		}
    },

    /* Retourne nbspCount espaces insecables */
    _: function(nbspCount) {
        var nbspString = "";
        for(var i = 0; i < nbspCount; i++) {
            nbspString += String.fromCharCode(160);
        }
        return nbspString;
    },

    htmlEncode: function(string) {
        var entityMap = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;",
            "/": "&#x2F;"
          };

        var encodedString = String(string).replace(/[&<>"'\/]/g, function (s) {
          return entityMap[s];
        });
        return encodedString;
    },

    /* Permet de précharger des images, appelle le callback passé en paramètre quand l'image est chargée */
    preload: function($img, callback) {

        callback = callback || function() {};

        $img.on("load", function() {
            callback();
        });

        var $preload = $("#preloaded-images");
        if($preload.length === 0) {
            $preload = $("<div>", {
                id: "preloaded-images",
                css: {
                    display: "none"
                }
            });
            $("body").prepend($preload);
        }
        $preload.append($img);
    },

    /** Dispatch un evenement sur <body> */
    dispatchEvent: function(eventName) {
        $("body").get(0).dispatchEvent(new Event(eventName));
    },

    /** Bind une fonction à un événement si la condition est vraie, sinon exécute la fonction */
    bindEventOrExecute: function(condition, event, fn) {
        if(condition) {
            $("body").on(event, fn);
        }
        else {
           fn();
        }
    },

    /**
     * Retourne la sélection texte d'un post.
     * Permet de contourner .getSelection() qui ne retourne pas l'alt des img sous Chrome
     */
    getPostSelection: function() {

        var selection = "";
        var selectionObject = window.getSelection();
        if (selectionObject.rangeCount) {
            var selectionWrapper = document.createElement("div");
            for (var i = 0; i < selectionObject.rangeCount; i++) {
                selectionWrapper.appendChild(selectionObject.getRangeAt(i).cloneContents());
            }
            selection = selectionWrapper.innerHTML;
        }

        //"Nettoyage" du post.
        selection = SK.Util.decodeEntities(selection
            //Suppression des linebreaks
            .replace(/\n/g, "")
            //<br> -> \n
            .replace(/<br ?\/?>/g, "\n")
            //suppression des quotes
            .replace(/<div class="quote-bloc">.*?<\/div>/g, "")
            //suppression des boutons de téléchargement
            .replace(/<div class="spawnkill-media-element(?:(?:.|\s)*?<\/div>){5}/g, "")
            //suppression des vidéos youtube
            .replace(/<iframe.*?class=".*?-media-element(?:(?:.|\s)*?<\/iframe>)/g, "")
            //Normalisation des liens Noelshack
            .replace(/http:\/\/www.noelshack.com\/(\d+)-(\d+)-([^\.]+\..{3})/g, "http://image.noelshack.com/fichiers/$1/$2/$3")
            //Suppression des <object>
            .replace(/<object[^>].*?<\/object>/g, "")
            //img -> img[alt]
            .replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, "$1")
            //a -> a[href]
            .replace(/<a[^>]*href="([^"]*)".*<\/a>/g, "$1")
            .replace(/<li class="post">/g, "")
            .replace(/<li class="ancre">[^>]*>/g, "")
            //suppression des li
            .replace(/<\/li>/g, "")
        );

        return selection;
    },

    /** Retourne une chaîne pseudo aléatoire. */
    pseudoRandomString: function() {
        return new Array(16 + 1).join((Math.random().toString(36) + "00000000000000000").slice(2, 18)).slice(0, 10);
    },

    decodeEntities: function(str) {
        var element = document.createElement("div");

        function decodeHTMLEntities(str) {
            if(str && typeof str === "string") {
                str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, "");
                str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, "");
                element.innerHTML = str;
                str = element.textContent;
                element.textContent = "";
            }

            return str;
        }

        return decodeHTMLEntities(str);
    }

};
