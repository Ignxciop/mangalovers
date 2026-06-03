import { param, body } from "express-validator";

export const chapterIdParamValidator = [
  param("chapterId")
    .isInt({ min: 1 })
    .withMessage("ID de capítulo inválido"),
];

export const commentIdParamValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID de comentario inválido"),
];

export const createCommentValidator = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("El contenido no puede estar vacío")
    .isLength({ min: 1, max: 1000 })
    .withMessage("El comentario debe tener entre 1 y 1000 caracteres"),
];

export const replyCommentValidator = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("El contenido no puede estar vacío")
    .isLength({ min: 1, max: 1000 })
    .withMessage("La respuesta debe tener entre 1 y 1000 caracteres"),
];

export const updateCommentValidator = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("El contenido no puede estar vacío")
    .isLength({ min: 1, max: 1000 })
    .withMessage("El comentario debe tener entre 1 y 1000 caracteres"),
];
