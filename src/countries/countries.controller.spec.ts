import { Test, TestingModule } from '@nestjs/testing';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';
import ApiResponse from '@/src/utils/api-response.util';
import { Document, Types } from 'mongoose';
import { Country } from './schemas/country.schema';

describe('CountriesController - getAllCountries', () => {
  let controller: CountriesController;
  let countriesService: CountriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CountriesController],
      providers: [
        {
          provide: CountriesService,
          useValue: {
            getAllCountries: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CountriesController>(CountriesController);
    countriesService = module.get<CountriesService>(CountriesService);
  });

  it('should successfully fetch all countries and return them as ApiResponse', async () => {
    // Arrange
    const mockCountries: (Document<unknown, Record<string, never>, Country> &
      Country &
      Required<{ _id: unknown }>)[] = [
      {
        _id: new Types.ObjectId(),
        countryCode: 'GS',
        flag: 'https://flagcdn.com/w320/gs.png',
        name: 'South Georgia and the South Sandwich Islands',
        region: 'Antarctic',
        currencies: [{ name: 'Saint Helena pound', symbol: '£' }],
        phoneCodes: ['+500'],
        countryCodeAlpha3: 'SGS',
        status: 'active',
        deletedAt: null,
        createdAt: new Date('2024-10-18T15:04:29.074Z'),
        updatedAt: new Date('2024-10-18T15:04:29.074Z'),
        $assertPopulated: jest.fn(),
        $clone: jest.fn(),
        $getAllSubdocs: jest.fn(),
        $ignore: jest.fn(),
        $isDeleted: jest.fn(),
        $isEmpty: jest.fn(),
        $isValid: jest.fn(),
        $locals: {},
        $markValid: jest.fn(),
        $op: null,
        $session: jest.fn(),
        $set: jest.fn(),
        $where: jest.fn(),
        base: null,
        collection: null,
        db: null,
        deleteOne: jest.fn(),
        depopulate: jest.fn(),
        directModifiedPaths: jest.fn(),
        equals: jest.fn(),
        execPopulate: jest.fn(),
        get: jest.fn(),
        init: jest.fn(),
        invalidate: jest.fn(),
        isDirectModified: jest.fn(),
        isDirectSelected: jest.fn(),
        isInit: jest.fn(),
        isModified: jest.fn(),
        isNew: jest.fn(),
        isSelected: jest.fn(),
        markModified: jest.fn(),
        modifiedPaths: jest.fn(),
        overwrite: jest.fn(),
        populate: jest.fn(),
        populated: jest.fn(),
        remove: jest.fn(),
        replaceOne: jest.fn(),
        save: jest.fn(),
        schema: null,
        set: jest.fn(),
        toJSON: jest.fn(),
        toObject: jest.fn(),
        unmarkModified: jest.fn(),
        update: jest.fn(),
        updateOne: jest.fn(),
        validate: jest.fn(),
        validateSync: jest.fn(),
      } as unknown as Document<unknown, Record<string, never>, Country> &
        Country &
        Required<{ _id: unknown }>,
    ];

    jest
      .spyOn(countriesService, 'getAllCountries')
      .mockResolvedValue(mockCountries);

    // Act
    const result = await controller.getAllCountries();

    // Assert
    expect(countriesService.getAllCountries).toHaveBeenCalled();
    expect(result).toBeInstanceOf(ApiResponse);
    expect(result).toEqual({
      status: true,
      message: 'All countries fetched successfully',
      data: mockCountries,
    });
  });

  it('should handle errors if fetching countries fails', async () => {
    // Arrange
    jest
      .spyOn(countriesService, 'getAllCountries')
      .mockRejectedValue(new Error('Failed to fetch countries'));

    // Act & Assert
    await expect(controller.getAllCountries()).rejects.toThrow(
      'Failed to fetch countries',
    );
  });
});
