"use strict";
/* jshint multistr: true */
/* jshint newcap: false */

/**
 * Usability : Permet d'ajouter des fonctionnalités améliorant l'ergonomie générale du forum
 */
SK.moduleConstructors.Usability = SK.Module.new();

SK.moduleConstructors.Usability.prototype.id = "Usability";
SK.moduleConstructors.Usability.prototype.title = "Amélioration de l'ergonomie";
SK.moduleConstructors.Usability.prototype.description = "Ajoute quelques fonctionnalités simples permettant d'améliorer la navigation";


SK.moduleConstructors.Usability.prototype.init = function() {
    //Rafraichir -> dernier post
    if (this.getSetting("refreshToLastPost")) {

        //La page vient d'être rafraichie
        if (this.isJustRefreshed()) {
            //Scrolle jusqu'au dernier message
            this.scrollToLastPost();

            // Nettoie l'URL
            window.location.hash = "";
        }
        this.editRefreshLinks();
    }

    if (this.getSetting("focusOnNewMessage")) {
        this.bindFocusOnNewMessage();
    }

    if (this.getSetting("betterMessageInput")) {

        $("#message_topic").autoGrow();

        // On a besoin des fonctionnalités de Quote pour overrider le bouton
        // de citations.
        if (SK.modules.Quote.activated) {
            this.overrideQuoteButton();
        }
    }

    if (this.getSetting("aliasNotifications")) {
        this.showAliasNotifications();
    }
};

/**
 * Modifie les liens de rafraichissement du sujet pour qu'ils renvoient vers le dernier post
 */
SK.moduleConstructors.Usability.prototype.editRefreshLinks = function() {

    // On supprime la classe du bouton actualiser pour modifier son comportement
    $(".btn-actualiser-forum")
        .removeClass("btn-actualiser-forum")
        .on("click", function() {
            window.location.href = SK.Util.currentSimpleUrl() + "#refresh";
            window.location.reload();
        })
    ;
};

SK.moduleConstructors.Usability.prototype.isJustRefreshed = function() {
    //Cette regexp teste si l'url contient ?refresh=1
    var regexp = /#refresh/;

    //Teste si la requête vient du bouton Rafraichir
    return regexp.test(document.URL);
};

/**
 * Scrolle la page au dernier message.
 */
SK.moduleConstructors.Usability.prototype.scrollToLastPost = function() {
    $(".conteneur-message").last().scrollThere();

};

/**
 * Ajoute le focus sur le sujet au clic sur "Nouveau topic"
 * ainsi que le focus sur le message au clic sur "Nouveau message"
 */
SK.moduleConstructors.Usability.prototype.bindFocusOnNewMessage = function() {

    // Nouveau topic
    $(".bloc-pre-left:first .btn-actu-new-list-forum").on("mousedown", function() {
        setTimeout(function() {
            $("#titre_topic").focus();
        }, 500);
    });

    // Nouveau message
    $(".btn-repondre-msg").on("mousedown", function() {
        setTimeout(function() {
            $("#message_topic").focus();
        }, 500);
    });
};

/**
 * Remplace l'événement onclick du bouton de citation par un nouvel
 * événement permettant de faire fonctionner autoGrow
 */
SK.moduleConstructors.Usability.prototype.overrideQuoteButton = function() {

    this.queueFunction(function() {

        // Supprime / Réinsère les boutons de citations pour unbind les events.
        var $quoteButtons = $("#forum-main-col .picto-msg-quote");
        var $newQuoteButtons = $();

        $quoteButtons.each(function () {
            var $parent = $(this).parent();
            var $newQuoteButton = $("<span>", {
                class: "picto-msg-quote",
            });
            this.remove();
            $parent.prepend($newQuoteButton);
            $newQuoteButtons = $newQuoteButtons.add($newQuoteButton);
        });

        // Bind un handler sur les nouveaux boutons.
        $newQuoteButtons.on("click", function() {
            var $msg = $(this).parents(".bloc-message-forum");
            var postId = $msg .attr("data-id");
            var pseudo = $msg.find(".bloc-pseudo-msg").text().replace(/[\r\n]/g, "");
            var date = $msg.find(".bloc-date-msg").text().replace(/[\r\n]/g, "").replace(/[\r\n]/g, "").replace(/#[0-9]+$/g, "");

            $.ajax({
                method: "POST",
                url: "/forums/ajax_citation.php",
                dataType: "json",
                data: {
                    id_message: postId,
                    ajax_timestamp: $("#ajax_timestamp_liste_messages").val(),
                    ajax_hash: $("#ajax_hash_liste_messages").val(),
                },
                success: function (data) {
                    if (data.erreur.length === 0) {
                        var quoteBlock = "> Le " + date + " '''" + pseudo + "''' a écrit :\n>" + data.txt.split("\n").join("\n> ") + "\n\n";
                        SK.modules.Quote.addToResponseThenFocus(quoteBlock);
                    }
                },
            });
        });
    });
};

/**
 * Affiche des pastilles de couleur à côté du bouton de changement d'alias si
 * un des pseudos secondaires de l'utilisateur a une nouvelle notification ou
 * un nouveau MP.
 */
SK.moduleConstructors.Usability.prototype.showAliasNotifications = function() {

    var $aliases = $(".modal-alias .nav-link-account:not(.active)");
    var $aliasButton = $(".modal-account-users:first");

    var aliasSubscriptions = 0;
    var aliasMps = 0;
    $aliases.each(function() {
        var $this = $(this);
        aliasSubscriptions += parseInt($this.find(".account-number-notif").attr("data-val"), 10);
        aliasMps += parseInt($this.find(".account-number-mp").attr("data-val"), 10);
    });


    if (aliasSubscriptions > 0 || aliasMps > 0) {
        var $notificationsHolder = $('<div>', { class: 'notification-holder modal-account-users' });

        if (aliasSubscriptions > 0) {
            $notificationsHolder.attr('data-sub-val', aliasSubscriptions);
        }

        if (aliasMps > 0) {
            $notificationsHolder.attr('data-mp-val', aliasMps);
        }

        $aliasButton.after($notificationsHolder);
    }
}

SK.moduleConstructors.Usability.prototype._addFullScreenButtonTo = function ($playerWrapper, url) {

    var $button = new SK.Button({
        class : " large",
        text : "Voir en pleine page",
        href : url,

        wrapper : {
            class : "full-screen-btn",
        }
    });

    $playerWrapper.append($button);
};

SK.moduleConstructors.Usability.prototype.settings = {
    refreshToLastPost: {
        title: "Rafraîchir au dernier message",
        description: "Le bouton \"Rafraîchir\" d'un topic amène directement au dernier post de ce topic",
        type: "boolean",
        default: true,
    },
    focusOnNewMessage: {
        title: "Focus au nouveau message",
        description: "les boutons \"Nouveau sujet\" et \"Répondre\" donnent le focus sur le champ de réponse",
        type: "boolean",
        default: true,
    },
    betterMessageInput: {
        title: "Améliorer la saisie des messages",
        description: "Redimensionne automatiquement la boîte de saisie des messages/topics et change le curseur au survol de la preview",
        type: "boolean",
        default: true,
    },
    aliasNotifications: {
        title: "Afficher les notifications des pseudos secondaires",
        description: "Ajoute une pastille à côté du bouton de changement de pseudo si un pseudo secondaire a une notification ou un MP",
        type: "boolean",
        default: true,
    },
    hideTopBar: {
        title: "Masquer la barre de navigation",
        description: "Cache la barre de navigation en haut de la page quand on scrolle",
        type: "boolean",
        default: false,
    },
    hideProspectBar: {
        title: "Récupérer l'espace entre le menu et la page",
        description: "Réduit l'espace vide entre l'entête de la page et son contenu",
        type: "boolean",
        default: true,
    },
};

SK.moduleConstructors.Usability.prototype.getCss = function() {
    var css = "";

    if (this.getSetting("betterMessageInput")) {
        css += "\
            .jv-editor .previsu-editor {\
                cursor: not-allowed;\
            }\
            .jv-editor .area-editor {\
                min-height: 76px !important;\
            }\
        ";
    }

    if (this.getSetting("hideTopBar")) {
        css += "\
            .header-affix {\
                display: none !important;\
            }\
        ";
    }

    if (this.getSetting("hideProspectBar")) {
        css += "\
            #content > div:nth-child(5) {\
                min-height: 20px !important;\
                height: 20px !important;\
                visibility: hidden !important;\
            }\
        ";
    }

    if (this.getSetting("aliasNotifications")) {
        css += "\
            .notification-holder {\
                z-index: -1;\
            }\
            .notification-holder:before,\
            .notification-holder:after {\
                position: absolute;\
                    left: 2.4rem;\
                border-radius: 50%;\
                padding: 0.16rem;\
            }\
            .notification-holder[data-mp-val]:after {\
                content: '';\
                top: 1.05rem;\
                background: #f60;\
            }\
            .notification-holder[data-sub-val]:before {\
                content: '';\
                bottom: 1.05rem;\
                background: #83C9E1;\
            }\
        ";
    }

    css += "\
        .account-number [data-val=\"0\"] {\
            color: rgba(134, 134, 149, 0.5);\
        }\
    ";

    return css;
};
