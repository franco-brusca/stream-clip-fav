# Usa una imagen base de Node.js
FROM node:18

# Instala FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia el package.json y el package-lock.json
COPY package*.json ./

# Instala las dependencias de la aplicación
RUN npm install

# Copia el resto del código de la aplicación
COPY . .

# Compila el código TypeScript a JavaScript
RUN npm run build

# Expone el puerto en el que la aplicación escucha (cámbialo según tu configuración)
EXPOSE 3000

# Define el comando para iniciar la aplicación
CMD ["npm", "start"]
