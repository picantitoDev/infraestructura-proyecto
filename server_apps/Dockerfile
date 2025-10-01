FROM jenkins/jenkins:jdk21

USER root

# Dependencias
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    lsb-release

# Agregar la GPG key
RUN wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor > /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Agrega el repositorio de hashicorp
RUN echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list

# Actualizar los paquetes
RUN apt-get update

# Instalar Terraform
RUN apt-get install -y terraform

# Instalar Ansible
RUN apt-get install -y ansible

USER jenkins
