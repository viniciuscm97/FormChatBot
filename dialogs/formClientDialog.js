const {
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


const { ClientProfile } = require('../class/ClientProfile');
const fetch = require("node-fetch");


const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const AGE_PROMPT = 'AGE_PROMPT';
const CPF_PROMPT = 'CPF_PROMPT';
const CEP_PROMPT = 'CEP_PROMPT';
const BIRTH_PROMPT = 'BIRTH_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class FormClientDialog extends ComponentDialog{
    
    constructor(userState) {
        super('formClientDialog')
        
        this.clientProfile = userState.createProperty(USER_PROFILE);
        this.clientState = '';
        this.clientCity = '';

        // Nome, idade, gênero (masculino, feminino, ou outro), CPF, CEP, data de aniversário.
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new NumberPrompt(AGE_PROMPT, this.agePromptValidator));
        this.addDialog(new NumberPrompt(CPF_PROMPT, this.cpfPropmtValidator));
        this.addDialog(new NumberPrompt(CEP_PROMPT, this.cepPromptValidator));
        this.addDialog(new TextPrompt(BIRTH_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        // this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        // this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));
        // this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT, this.picturePromptValidator));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.nameStep.bind(this),
            this.ageStep.bind(this),
            this.genderStep.bind(this),
            this.cpfStep.bind(this),
            this.cepStep.bind(this),
            this.birthdayStep.bind(this),
            this.confirmStep.bind(this),
            this.finalStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;

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

    async nameStep(step){
        
        return await step.prompt(NAME_PROMPT, 'Por favor insira seu nome:');        
    }

    async ageStep(step){
        step.values.name = step.result;

        const promptOptions = { prompt: 'Por favor digite a sua idade: ', retryPrompt: 'A idade deve ser entre 0 e 150 anos. Digite novamente:' };


        return await step.prompt(AGE_PROMPT,promptOptions);
    }

    async genderStep(step) {
        step.values.age = step.result;
        return await step.prompt(CHOICE_PROMPT,
            {
                prompt: 'Escolha seu gênero: ',
                choices: ChoiceFactory.toChoices(['Homem', 'Mulher', 'Outro'])
        });
    }
    async cpfStep(step) {
        step.values.gender = step.result.value;

        const promptOptions = { prompt: 'Por favor insira seu CPF (somente números) :\n EX: 02569011616', retryPrompt: 'O CPF deve ter 11 digitos!' };

        return await step.prompt(CPF_PROMPT, promptOptions);
    }

    async cepStep(step) {
        step.values.cpf = step.result;

        const promptOptions = { prompt: 'Por favor insira seu CEP (somente números): \n EX: 9212050', retryPrompt: 'O CEP esta incorreto. Por favor digite novamente:' };

        return await step.prompt(CEP_PROMPT, promptOptions);
    }

    async birthdayStep(step) {
        step.values.cep = step.result;

        return await step.prompt(BIRTH_PROMPT, 'insira sua data de nascimento:');
    }

    async confirmStep(step) {
        step.values.birth = step.result;
        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Confirma as informações enviadas?' });
    }


    async finalStep(step) {
        if (step.result) {
            // Get the current profile object from user state.
            const clientProfile = await this.clientProfile.get(step.context, new ClientProfile());

            clientProfile.name = step.values.name;
            clientProfile.age = step.values.age;
            clientProfile.gender = step.values.gender;
            clientProfile.cpf = step.values.cpf;
            clientProfile.cep = step.values.cep;
            clientProfile.birth = step.values.birth;
            clientProfile.city = this.clientCity;
            clientProfile.state = this.clientState;


            let cpfFormatted = clientProfile.cpf.toString().replace(/(\d{3})?(\d{3})?(\d{3})?(\d{2})/, "$1.$2.$3-$4");

            let msg = `Seu nome é ${ clientProfile.name }, você nasceu no dia ${ clientProfile.birth }, e seu gênero é ${ clientProfile.gender }.
            Seu CPF é ${ cpfFormatted }, e você reside na cidade ${clientProfile.city} - ${clientProfile.state}.
            \n Seja bem-vindo! 😊`;
            msg += '.';

            await step.context.sendActivity(msg);

        } else {
            await step.context.sendActivity('Obrigado. Suas informações não serão salvas!');
        }

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is the end.
        return await step.endDialog();
    }

    validaCepUrl(data) {
        this.clientState = data.uf;
        this.clientCity = data.localidade;

    }

    async cpfPropmtValidator (promptContext) {

        return promptContext.recognized.succeeded && promptContext.recognized.value.toString().length == 11;
    }

    async agePromptValidator (promptContext) {
        return promptContext.recognized.succeeded && promptContext.recognized.value > 0 && promptContext.recognized.value < 150;
    }

    async cepPromptValidator (promptContext) {
        var cepSomenteNumeros = promptContext.recognized.value.toString().replace(/\D/g, '');
        var cepValidoNaBase = false;

        await fetch(`https://viacep.com.br/ws/${cepSomenteNumeros}/json/`)
        .then(res => res.json())
        .then(data => {
            if(!data.erro){
                this.clientState = data.uf;
                this.clientCity = data.localidade;
                cepValidoNaBase = true;
            }
        }).catch( err => console.log(err))

        if(/^[0-9]{8}$/.test(cepSomenteNumeros) && cepValidoNaBase){    
            return true
        }else{
            if (!cepValidoNaBase) {
                promptContext.context.sendActivity('O CEP não foi encontrado na base de dados!')
            } else {
                promptContext.context.sendActivity('O CEP deve conter 8 dígitos!')
            }
            return false;
        }
    }






}

module.exports.FormClientDialog = FormClientDialog;