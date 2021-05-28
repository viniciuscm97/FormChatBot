const { LuisRecognizer } = require('botbuilder-ai');
const { ComponentDialog, DialogSet, DialogTurnStatus, TextPrompt, WaterfallDialog } = require("botbuilder-dialogs");
const { MessageFactory, InputHints} = require('botbuilder')

const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';

class MainDialog extends ComponentDialog {

    constructor(luisRecognizer, formClientDialog, loveApiDialog) {
        super('MainDialog');
        if(!luisRecognizer) throw new Error('[MainDialog]: Missing parameter \'luisRecognizer\' is required')
        this.luisRecognizer = luisRecognizer;

        if(!formClientDialog) throw new Error('[MainDialog]: Missing parameter \'formClientDialog\' is required')
        if(!loveApiDialog) throw new Error('[MainDialog]: Missing parameter \'loveApiDialog\' is required')

        this.addDialog(new TextPrompt('TextPrompt'))
            .addDialog(formClientDialog)
            .addDialog(loveApiDialog)
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
                this.introStep.bind(this),
                this.actStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = MAIN_WATERFALL_DIALOG;

    }

    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async introStep(stepContext) {
        // console.log(this.luisRecognizer)
        if (!this.luisRecognizer.isConfigured) {
            const messageText = 'NOTE: LUIS is not configured. To enable all capabilities, add `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName` to the .env file.';
            await stepContext.context.sendActivity(messageText, null, InputHints.IgnoringInput);
            return await stepContext.next();
        }

        const messageText = stepContext.options.restartMsg ? stepContext.options.restartMsg : `Opções disponiveis: 
        \Cadastro de pessoa: 
        \n"Cadastrar usuário feminino de 25 anos" ou "Cadastrar cliente masculino"
        \nCompatibilidade no amor: 
        \n"Primeiro nome Joao segundo nome Maria" ou "Joao e Maria"`;
        const promptMessage = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt('TextPrompt', { prompt: promptMessage });
    }

    async actStep(stepContext) {
        
        const formDetails = {};
        const apiDetails = {};
        if (!this.luisRecognizer.isConfigured) {
            return await stepContext.beginDialog('formClientDialog', formDetails);
        }

        // Call LUIS and gather any potential booking details. (Note the TurnContext has the response to the prompt)
        const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
        switch (LuisRecognizer.topIntent(luisResult)) {
        case 'CreateUser': {

            const genderEntities = this.luisRecognizer.getGenderFormEntities(luisResult);
            const nameEntities = this.luisRecognizer.getNameFormEntities(luisResult);
            const ageEntities = this.luisRecognizer.getAgeFormEntities(luisResult);

            formDetails.gender = genderEntities.genders;
            formDetails.name = nameEntities.names;
            formDetails.age = ageEntities.ages;
            

            console.log('LUIS extracted these booking details:', JSON.stringify(formDetails));

            // Run the BookingDialog passing in whatever details we have from the LUIS call, it will fill out the remainder.
            return await stepContext.beginDialog('formClientDialog', formDetails);
        }

        case 'Cancel': {
            // We haven't implemented the GetWeatherDialog so we just display a TODO message.
            const cancelMessageText = 'Finalizando aplicação';
            await stepContext.context.sendActivity(cancelMessageText, cancelMessageText, InputHints.IgnoringInput);
            break;
        }

        case 'LoveApi': {
            const apiEntities = this.luisRecognizer.getApiEntities(luisResult);

            apiDetails.firstName = apiEntities.first;
            apiDetails.secondName = apiEntities.second;
            console.log('LUIS extracted these booking details:', JSON.stringify(apiDetails));

            return await stepContext.beginDialog('loveApiDialog', apiDetails);
        }

        default: {
            // Catch all for unhandled intents  
            const didntUnderstandMessageText = `Desculpe, não entendi o que foi informado. Tente de outro jeito (intenção foi ${ LuisRecognizer.topIntent(luisResult) })`;
            await stepContext.context.sendActivity(didntUnderstandMessageText, didntUnderstandMessageText, InputHints.IgnoringInput);
        }
        }

        return await stepContext.next();
    }

    async showWarningForUnsupportedGenders(context, genderEntities) {
        const unsupportedGenders = [];
        if (genderEntities.sexo && !genderEntities.genders) {
            unsupportedGenders.push(genderEntities.from);
        }

        if (unsupportedGenders.length) {
            const messageText = `Sorry but the following genders are not supported: ${ unsupportedGenders.join(', ') }`;
            await context.sendActivity(messageText, messageText, InputHints.IgnoringInput);
        }
    }

    async finalStep(stepContext) {
        if (stepContext.result) {
            if (stepContext.result.name ) {
    
                const result = stepContext.result;
                const msg = `Seja bem-vindo ${ result.name }! 😊 `;
                await stepContext.context.sendActivity(msg, msg, InputHints.IgnoringInput);
            }
            
        }

        // Restart the main dialog with a different message the second time around
        return await stepContext.replaceDialog(this.initialDialogId, { restartMsg: 'O que mais posso fazer para você?' });
    }
    
}
module.exports.MainDialog = MainDialog;