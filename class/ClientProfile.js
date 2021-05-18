class ClientProfile {
    constructor(name, age, cpf,cep,birth,gender) {
        this.name = name;
        this.age = age;
        this.gender = gender;
        this.cpf = cpf;
        this.cep = cep;
        this.birth = birth;
    }
}

module.exports.ClientProfile = ClientProfile;

