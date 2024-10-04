# Stream Clip Fav

Este proyecto es una aplicación web que permite descargar clips de YouTube utilizando Node.js, Express y ffmpeg.

> Aclaración: Esto es un prototipo que no pudimos terminar por falta de tiempo, todavía tiene muchas mejoras por delante. Si tenés interés en contribuir, adelante.

## Requisitos

- [Node.js](https://nodejs.org/en) (v14 o superior)
- npm (v6 o superior) (viene incluído en la instalación de Node)
- [ffmpeg](https://www.ffmpeg.org/download.html)

### Requisitos para usar con Docker

- [Docker](https://docs.docker.com/get-started/get-docker/) (para uso con Docker Compose)
- [Docker Compose](https://docs.docker.com/compose/install/) (v3.8 o superior)

## Instalación

### Clonar el repositorio

```bash
git clone https://github.com/franco-brusca/stream-clip-fav.git
cd stream-clip-fav
```

### Instalación y Uso con Node.js y npm

1. Correr los comandos de instalación, compilación e iniciación

```bash
npm install
npm build
npm start
```

2. Ir a https://localhost:3000.
3. Pegar un link de un clip de YouTube en la caja de texto.
4. Click en el botón de "Download".
5. Se verá un (no muy acertado) progreso hasta finalizar.

> Tip: En la consola del navegador, en la pestaña de "Network" se podrá ver el estado de la request y los errores en caso de fallo.

Cada tanto suele fallar porque YouTube actualiza su seguridad, normalmente se corrige actualizando el paquete que se encarga de _hackear_ youtube.

Comando para actualizar ese paquete a su última versión:

`npm install @distube/ytdl-core@latest`

### Instalación y Uso con Docker

#### Requisitos Previos

- Asegúrate de tener Docker y Docker Compose instalados en tu sistema.

#### Levantar los Servicios con Docker Compose

1. Construye y levanta los servicios utilizando Docker Compose:

   ```bash
   docker-compose up --build
   ```

2. La aplicación estará disponible en `http://localhost:3000`.

3. Para verificar el estado de los servicios:

   ```bash
   docker-compose ps
   ```

4. Para revisar los logs de la aplicación:

   ```bash
   docker-compose logs app
   ```

5. Para detener los servicios:
   ```bash
   docker-compose down
   ```

## Uso

### Consultar info del video

Para consultar las opciones disponibles realiza una solicitud GET al endpoint `/clipInfo`

```bash
curl http://localhost:3000/clipInfo -H "Content-Type: application/json" -d '{"url": "https://youtube.com/clip/UgkxcP_zp2NSsu1ei9RUEMc_oX3a9LhWKZmq?si=_h0NFTV8olybxiq6"}'
```

### Encolar un Trabajo

Para encolar un trabajo que descargue un clip de YouTube, realiza una solicitud POST al endpoint `/enqueue`:

```bash
curl -X POST http://localhost:3000/enqueue -H "Content-Type: application/json" -d '{"url": "https://youtube.com/clip/UgkxcP_zp2NSsu1ei9RUEMc_oX3a9LhWKZmq?si=FavU3WSEx14fgKpU"}'
```

### Consultar el Estado de un Trabajo

Para consultar el estado de un trabajo, realiza una solicitud GET al endpoint `/status/:id`, reemplazando `:id` con el `jobId` recibido:

```bash
curl http://localhost:3000/status/<jobId>
```

### Descargar archivo

Para descargar el clip realiza una solicitud POST al endpoint `/download-fIle`:

```bash
curl -X POST http://localhost:3000/enqueue -H "Content-Type: application/json" -d '{"file": "/tmp/fef45e1b-473a-45c3-912e-e5ab04e89c6a.mp4"}'
```

## To-Do List

- Validar que el % esté bien seteado.
- Estandarizar los mensajes push para progress, etc.
