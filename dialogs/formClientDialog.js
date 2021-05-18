const { MessageFactory } = require('botbuilder');

const {
    AttachmentPrompt,
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');


const { Channels } = require('botbuilder-core');
const { ClientProfile } = require('../class/ClientProfile');


class FormClientDialog extends ComponentDialog{
    constructor(userState) {
        super('formClientDialog')
    }


}

module.exports.FormClientDialog = FormClientDialog;