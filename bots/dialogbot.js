// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler,  MessageFactory } = require('botbuilder');

class DialogBot extends ActivityHandler {

    constructor(conversationState, userState, dialog) {
        super();
        
        this.checkRequire(conversationState,userState,dialog);

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.dialogState = this.conversationState.createProperty('DialogState');

        this.onMessage(async (context, next) => {

            await this.dialog.run(context, this.dialogState);
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = `Bem vindo!
            \n Digite algo para começar: `;
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    checkRequire(conversation,user,dialog){
        if (!conversation) throw new Error('[DialogBot]: Missing parameter. conversationState is required');
        if (!user) throw new Error('[DialogBot]: Missing parameter. userState is required');
        if (!dialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');
    }

    async run(context) {
        await super.run(context);

        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context,false);
    }

}

module.exports.DialogBot = DialogBot;
