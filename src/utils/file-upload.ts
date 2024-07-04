import { BadGatewayException } from '@nestjs/common';
import { extname } from 'path';
import * as fs from 'fs';

export const bookFileUploadFilter = (
  req,
  file: Express.Multer.File,
  callback,
) => {
  if (!file.originalname.match(/\.(jpg|png|jpeg)$/)) {
    return callback(new Error('Only image files are allowed!'), false);
  }
  callback(null, true);
};

export const editFileName = (file: Express.Multer.File) => {
  try {
    const name = file.originalname.split('.')[0];
    const filteredName = name.replace(/ /g, '_');
    const fileExtName = extname(file.originalname);
    const randomName = Array(4)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    return `${filteredName}-${randomName}${fileExtName}`;
  } catch (error) {
    throw new BadGatewayException('Error while editing file');
  }
};

export const fileUpload = (
  newName: string,
  file: Express.Multer.File,
  path: string,
): string => {
  const filePath = `public/${path}/${newName}`;

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }

  fs.writeFile(filePath, file.buffer, (error) => {
    if (error) throw new BadGatewayException('Error while uploading file');
  });

  return `${process.env.IMAGE_URL}${path}/${newName}`;
};
