import Ghii, { ghii } from '../ghii';

describe('Ghii Config', () => {
  it('Ghii is instantiable', () => {
    expect(Ghii).toBeDefined();
  });

  describe('base configs', () => {
    it('load default (valid) options', async () => {
      type FooType = { prop: string };
      type S3Type = { ciao: string };
      const target = ghii<{
        foo: FooType;
        foo2: FooType;
        s3: S3Type;
      }>();

      target
        .section('foo', {
          defaults: { prop: 'ciao' },
          validator(joi) {
            return joi.object<FooType>({
              prop: joi.string().required(),
            });
          },
        })
        .section('foo2', {
          defaults: { prop: 'ciao' },
          validator(joi) {
            return joi.object<FooType>({
              prop: joi.string().required(),
            });
          },
        })
        .section('s3', {
          validator: joi => joi.object({ url: joi.string().required() }).unknown(),
          defaults: { ciao: 'world' },
        })
        .loader(async () => ({ s3: { url: 'ciao' } }));
      const result = await target.takeSnapshot();
      expect(result).toStrictEqual({
        foo: { prop: 'ciao' },
        foo2: { prop: 'ciao' },
        s3: { ciao: 'world', url: 'ciao' },
      });
    });

    it('loader (valid) options', async () => {
      type FooType = { prop: string };
      const target = ghii<{ foo: FooType }>();
      target.section('foo', {
        defaults: { prop: 'goodbye' },
        validator(joi) {
          return joi.object<FooType>({
            prop: joi.string().required(),
          });
        },
        required: false,
      });
      target.loader(async () => ({ foo: { prop: 'ciao' } }));
      const result = await target.takeSnapshot();
      expect(result).toStrictEqual({ foo: { prop: 'ciao' } });
    });

    it('simple property (valid) options', async () => {
      type FooType = 'a' | 'b';
      const target = ghii<{ foo: FooType }>();
      target.section('foo', {
        defaults: 'a',
        validator(joi) {
          return joi.string().allow('a', 'b');
        },
        required: false,
      });
      target.loader(async () => ({ foo: 'b' }));
      const result = await target.takeSnapshot();
      expect(result).toStrictEqual({ foo: 'b' });
    });

    it('loader without defaults (valid) options', async () => {
      type FooType = { prop: string };
      const target = ghii<{ foo: FooType }>();
      target.section('foo', {
        validator(joi) {
          return joi.object<FooType>({
            prop: joi.string().required(),
          });
        },
        required: true,
      });
      target.loader(async () => ({ foo: { prop: 'ciao' } }));
      const result = await target.takeSnapshot();
      expect(result).toStrictEqual({ foo: { prop: 'ciao' } });
    });

    it('loader without defaults (valid) options', async () => {
      type FooType = { prop: string };
      const target = ghii<{ foo: FooType }>();
      target.section('foo', {
        validator(joi) {
          return joi.object<FooType>({
            prop: joi.string().required(),
          });
        },
      });
      target.loader(async () => ({ foo: { prop: 'ciao' } }));
      const result = await target.takeSnapshot();
      expect(result).toStrictEqual({ foo: { prop: 'ciao' } });
    });
    it('load default (invalid) options', () => {
      type FooType = { prop: string };
      const target = ghii<{ foo: FooType }>();
      target.section('foo', {
        defaults: { prop: 'goodbye' },
        validator(joi) {
          return joi.object<FooType>({
            prop: joi.string().length(10).required(),
          });
        },
      });

      return expect(target.takeSnapshot()).rejects.toMatchObject([
        { reason: { err: true, key: 'foo' }, status: 'rejected' },
      ]);
    });

    it('load loader (invalid) options', () => {
      type FooType = { prop: string };
      const target = ghii<{ foo: FooType }>();
      target.section('foo', {
        defaults: { prop: 'goodbye' },
        validator(joi) {
          return joi.object<FooType>({
            prop: joi.string().length(7).required(),
          });
        },
      });
      target.loader(async () => ({ foo: { prop: 'ciao' } }));
      return expect(target.takeSnapshot()).rejects.toMatchObject([
        { reason: { err: true, key: 'foo' }, status: 'rejected' },
      ]);
    });

    it('load loader (invalid) options', () => {
      type FooType = { prop: string };
      const target = ghii<{ foo: FooType }>();
      target.section('foo', {
        // defaults: { prop: 'goodbye' },
        validator(joi) {
          return joi.object<FooType>({
            prop: joi.string().length(3).required(),
          });
        },
      });
      target.loader(async () => ({ foo: { prop: 'ciao' } }));
      return expect(target.takeSnapshot()).rejects.toMatchObject([
        { reason: { err: true, key: 'foo' }, status: 'rejected' },
      ]);
    });
  });

  describe('history and version', () => {
    it('have empty history and latestVersion if no snapshot is taken', () => {
      const target = Ghii<{ a: { test: 'string' | 'defaults' } }>().section('a', {
        validator: joi => joi.string(),
        defaults: { test: 'defaults' },
      });

      expect(target.history()).toStrictEqual([]);
      expect(target.latestVersion()).toBeUndefined();
      expect(target.snapshot()).toStrictEqual({ a: { test: 'defaults' } });
    });

    it('have history and latestVersion if  snapshot is taken', () => {
      const target = Ghii<{ a: { test: 'string' } }>().section('a', {
        validator: joi => joi.string(),
      });
      target.snapshot({ a: { test: 'string' } });
      expect(target.history()).toHaveLength(1);
      expect(target.latestVersion()).toBeDefined();
      expect(target.snapshot()).toStrictEqual({ a: { test: 'string' } });
    });
    it('await snapshot', async () => {
      let guard = false;
      const target = Ghii<{ a: { test: 'string' } }>()
        .section('a', {
          validator: joi => joi.object({ test: joi.string() }),
        })
        .loader(
          () =>
            new Promise(resolve => {
              setTimeout(() => {
                guard = true;
                resolve({ a: { test: 'string' } });
              }, 10);
            })
        );

      await target.waitForFirstSnapshot('./__test__/fakeModule');
      expect(guard).toBeTruthy();
      expect(target.history()).toHaveLength(1);
      expect(target.latestVersion()).toBeDefined();
      expect(target.snapshot()).toStrictEqual({ a: { test: 'string' } });
    });

    it('await when a snapshot is available', async () => {
      const target = Ghii<{ a: { test: 'string' } }>().section('a', {
        validator: joi => joi.string(),
      });
      target.snapshot({ a: { test: 'string' } });
      await target.waitForFirstSnapshot('./__test__/fakeModule');

      expect(target.history()).toHaveLength(1);
      expect(target.latestVersion()).toBeDefined();
      expect(target.snapshot()).toStrictEqual({ a: { test: 'string' } });
    });

    it('await when a snapshot is available', async () => {
      const target = Ghii<{ a: { test: 'string' } }>().section('a', {
        validator: joi => joi.string(),
      });
      target.snapshot({ a: { test: 'string' } });
      await target.waitForFirstSnapshot('./__test__/fakeModule');
      target.snapshot({ a: { test: 'string' } });
      await target.waitForFirstSnapshot('./__test__/fakeModule');
      const fakeModule = await import('./fakeModule');
      expect(fakeModule.default).toStrictEqual(1);
      expect(target.history()).toHaveLength(2);
      expect(target.latestVersion()).toBeDefined();
      expect(target.snapshot()).toStrictEqual({ a: { test: 'string' } });
    });

    it('slow loader time out await snapshot', async () => {
      const target = Ghii<{ a: { test: 'string' } }>()
        .section('a', {
          validator: joi => joi.object({ test: joi.string() }),
        })
        .loader(
          () =>
            new Promise(resolve => {
              setTimeout(() => {
                resolve({ a: { test: 'string' } });
              }, 50);
            })
        );
      try {
        await target.waitForFirstSnapshot('./__test__/fakeModule', { timeout: 10 });
        fail("This line isn't reachable, without a snapshot!");
      } catch (err) {
        // Good
      }
    });
  });
});
