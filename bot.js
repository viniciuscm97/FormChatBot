// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActionTypes,ActivityHandler, CardFactory, MessageFactory } = require('botbuilder');

class FormBot extends ActivityHandler {

    constructor(conversationState, userState, dialog) {
        super();
        
        this.checkRequire(conversationState,userState,dialog);

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.dialogState = this.conversationState.createProperty('DialogState');

        this.onMessage(async (context, next) => {
            console.log('Running dialog with Message Activity.');

            // Run the Dialog with the new message Activity.
            await this.dialog.run(context, this.dialogState);

            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome!';
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

    async sendIntroCard(context) {
        const card = CardFactory.heroCard(
            'Welcome to Bot Framework!',
            'Welcome to Welcome Users bot sample! This Introduction card is a great way to introduce your Bot to the user and suggest some things to get them started. We use this opportunity to recommend a few next steps for learning more creating and deploying bots.',
            ['https://aka.ms/bf-welcome-card-image'],
            [
                {
                    type: ActionTypes.OpenUrl,
                    title: 'Get an overview',
                    value: 'https://docs.microsoft.com/en-us/azure/bot-service/?view=azure-bot-service-4.0'
                },
                {
                    type: ActionTypes.OpenUrl,
                    title: 'Ask a question',
                    value: 'https://stackoverflow.com/questions/tagged/botframework'
                },
                {
                    type: ActionTypes.OpenUrl,
                    title: 'Learn how to deploy',
                    value: 'https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-howto-deploy-azure?view=azure-bot-service-4.0'
                }
            ]
        );

        await context.sendActivity({ attachments: [card] });
    }
}

module.exports.FormBot = FormBot;
